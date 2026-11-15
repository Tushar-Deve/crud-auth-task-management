const zlib = require("node:zlib");

const MAX_PDF_INPUT_BYTES = 100 * 1024 * 1024;
const MAX_DECOMPRESSED_STREAM_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_DECOMPRESSED_BYTES = 40 * 1024 * 1024;
const MAX_PDF_STREAMS_TO_INSPECT = 2048;
const MAX_PDF_OBJECTS = 50000;
const MAX_PDF_TOKENS = 1000000;
const MAX_PDF_VALUE_NODES = 100000;
const MAX_PDF_VALUE_DEPTH = 64;
const MAX_STREAM_DICTIONARY_BYTES = 1024 * 1024;
const MAX_INDIRECT_OBJECT_VALUE_BYTES = 64 * 1024;
const MAX_PDF_TOKEN_BYTES = 1024 * 1024;
const MAX_FILTERS_PER_STREAM = 16;
const MAX_FILTER_REFERENCE_DEPTH = 16;
const MAX_FILTER_REFERENCES = 64;
const MAX_PDF_OBJECT_HEADER_CANDIDATES = MAX_PDF_OBJECTS;
const MAX_INDIRECT_LENGTH_REFERENCES = MAX_PDF_STREAMS_TO_INSPECT;
const MAX_TOTAL_INDIRECT_LENGTH_VALUE_BYTES = 8 * 1024 * 1024;

const ACTIVE_PDF_NAMES = /\/(?:JavaScript|JS|Launch|EmbeddedFiles?|OpenAction|AA|RichMedia|XFA|SubmitForm|ImportData|GoToR)(?![A-Za-z0-9#])/;
const ACTIVE_PDF_NAMES_WITHOUT_EMBEDDED_FILES = /\/(?:JavaScript|JS|Launch|OpenAction|AA|RichMedia|XFA|SubmitForm|ImportData|GoToR)(?![A-Za-z0-9#])/;
const EMBEDDED_PDF_NAMES = /\/EmbeddedFiles?(?![A-Za-z0-9#])/g;

function isPdfWhitespace(code) {
    return code === 0 || code === 9 || code === 10 || code === 12 || code === 13 || code === 32;
}

function isPdfDelimiter(code) {
    return code === 40 || code === 41 || code === 60 || code === 62
        || code === 91 || code === 93 || code === 123 || code === 125
        || code === 47 || code === 37;
}

function skipPdfWhitespaceAndComments(text, position, limit) {
    let cursor = position;
    while (cursor < limit) {
        const code = text.charCodeAt(cursor);
        if (isPdfWhitespace(code)) {
            cursor += 1;
            continue;
        }
        if (code === 37) {
            cursor += 1;
            while (cursor < limit && text.charCodeAt(cursor) !== 10 && text.charCodeAt(cursor) !== 13) {
                cursor += 1;
            }
            continue;
        }
        break;
    }
    return cursor;
}

function decodePdfName(rawName) {
    if (/#(?![0-9a-f]{2})/i.test(rawName)) return null;
    return rawName.replace(/#([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function decodePdfNameEscapes(text) {
    return text.replace(/#([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function readPdfToken(text, position, limit) {
    const start = skipPdfWhitespaceAndComments(text, position, limit);
    if (start >= limit) return { kind: "eof", start: limit, end: limit };

    const code = text.charCodeAt(start);
    const nextCode = text.charCodeAt(start + 1);

    if (code === 40) {
        let depth = 1;
        let cursor = start + 1;
        while (cursor < limit && depth > 0) {
            const current = text.charCodeAt(cursor);
            if (current === 92) {
                cursor += 1;
                if (text.charCodeAt(cursor) === 13 && text.charCodeAt(cursor + 1) === 10) cursor += 2;
                else if (cursor < limit) cursor += 1;
                continue;
            }
            if (current === 40) {
                depth += 1;
                if (depth > MAX_PDF_VALUE_DEPTH) return null;
            } else if (current === 41) {
                depth -= 1;
            }
            cursor += 1;
        }
        if (depth !== 0) return null;
        return { kind: "string", start, end: cursor };
    }

    if (code === 60) {
        if (nextCode === 60) return { kind: "dictStart", start, end: start + 2 };
        let cursor = start + 1;
        while (cursor < limit && text.charCodeAt(cursor) !== 62) {
            const current = text.charCodeAt(cursor);
            if (!isPdfWhitespace(current) && !/[0-9a-f]/i.test(text[cursor])) return null;
            cursor += 1;
        }
        if (cursor >= limit) return null;
        return { kind: "hexString", start, end: cursor + 1 };
    }

    if (code === 62) {
        if (nextCode !== 62) return null;
        return { kind: "dictEnd", start, end: start + 2 };
    }
    if (code === 91) return { kind: "arrayStart", start, end: start + 1 };
    if (code === 93) return { kind: "arrayEnd", start, end: start + 1 };

    if (code === 47) {
        let cursor = start + 1;
        while (cursor < limit && !isPdfWhitespace(text.charCodeAt(cursor)) && !isPdfDelimiter(text.charCodeAt(cursor))) {
            cursor += 1;
            if (cursor - start > MAX_PDF_TOKEN_BYTES) return null;
        }
        const value = decodePdfName(text.slice(start + 1, cursor));
        if (value === null) return null;
        return { kind: "name", value, start, end: cursor };
    }

    if (code === 37) return null;
    if (code === 41 || code === 123 || code === 125) return null;

    let cursor = start;
    while (cursor < limit && !isPdfWhitespace(text.charCodeAt(cursor)) && !isPdfDelimiter(text.charCodeAt(cursor))) {
        cursor += 1;
        if (cursor - start > MAX_PDF_TOKEN_BYTES) return null;
    }
    if (cursor === start) return null;
    return { kind: "word", value: text.slice(start, cursor), start, end: cursor };
}

function parseIntegerToken(token) {
    if (!token || token.kind !== "word" || !/^[+-]?\d+$/.test(token.value)) return null;
    const value = Number(token.value);
    return Number.isSafeInteger(value) ? value : null;
}

function parsePdfValue(text, position, limit, state, depth = 0) {
    if (depth > MAX_PDF_VALUE_DEPTH) return null;
    state.nodes += 1;
    if (state.nodes > MAX_PDF_VALUE_NODES) return null;

    const token = readPdfToken(text, position, limit);
    if (!token || token.kind === "eof") return null;

    if (token.kind === "name") {
        return { value: { kind: "name", value: token.value }, next: token.end };
    }
    if (token.kind === "string" || token.kind === "hexString") {
        return { value: { kind: "string" }, next: token.end };
    }

    if (token.kind === "arrayStart") {
        const items = [];
        let cursor = token.end;
        while (cursor < limit) {
            const nextToken = readPdfToken(text, cursor, limit);
            if (!nextToken) return null;
            if (nextToken.kind === "arrayEnd") return { value: { kind: "array", items }, next: nextToken.end };
            if (nextToken.kind === "eof") return null;
            const item = parsePdfValue(text, cursor, limit, state, depth + 1);
            if (!item) return null;
            items.push(item.value);
            cursor = item.next;
        }
        return null;
    }

    if (token.kind === "dictStart") {
        const entries = Object.create(null);
        let cursor = token.end;
        while (cursor < limit) {
            const key = readPdfToken(text, cursor, limit);
            if (!key) return null;
            if (key.kind === "dictEnd") return { value: { kind: "dict", entries }, next: key.end };
            if (key.kind !== "name" || Object.prototype.hasOwnProperty.call(entries, key.value)) return null;
            const parsed = parsePdfValue(text, key.end, limit, state, depth + 1);
            if (!parsed) return null;
            entries[key.value] = parsed.value;
            cursor = parsed.next;
        }
        return null;
    }

    if (token.kind !== "word") return null;
    if (token.value === "true" || token.value === "false") {
        return { value: { kind: "boolean", value: token.value === "true" }, next: token.end };
    }
    if (token.value === "null") return { value: { kind: "null" }, next: token.end };

    if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(token.value)) {
        const value = Number(token.value);
        if (!Number.isFinite(value)) return null;

        const integer = parseIntegerToken(token);
        if (integer !== null) {
            const generationToken = readPdfToken(text, token.end, limit);
            const markerToken = generationToken && generationToken.kind !== "eof"
                ? readPdfToken(text, generationToken.end, limit)
                : null;
            const generation = parseIntegerToken(generationToken);
            if (generation !== null && generation >= 0 && generation <= 65535
                && markerToken?.kind === "word" && markerToken.value === "R" && integer > 0) {
                return {
                    value: { kind: "ref", objectNumber: integer, generation },
                    next: markerToken.end,
                };
            }
        }
        return { value: { kind: "number", value, integer: Number.isInteger(value) }, next: token.end };
    }

    return { value: { kind: "keyword", value: token.value }, next: token.end };
}

function parsePdfValueExactly(text, start, limit, state) {
    const parsed = parsePdfValue(text, start, limit, state);
    if (!parsed || skipPdfWhitespaceAndComments(text, parsed.next, limit) !== limit) return null;
    return parsed.value;
}

function referenceKey(reference) {
    return String(reference.objectNumber) + ":" + String(reference.generation);
}

function createObjectDefinitionIndex(text) {
    const index = new Map();
    const pattern = /\b(\d{1,16})\s+(\d{1,5})\s+obj\b/g;
    let candidateCount = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
        candidateCount += 1;
        if (candidateCount > MAX_PDF_OBJECT_HEADER_CANDIDATES) return null;

        const objectNumber = Number(match[1]);
        const generation = Number(match[2]);
        if (!Number.isSafeInteger(objectNumber) || objectNumber <= 0
            || !Number.isSafeInteger(generation) || generation < 0 || generation > 65535) continue;

        const key = String(objectNumber) + ":" + String(generation);
        const definitions = index.get(key) || [];
        definitions.push({ headerOffset: match.index, valueStart: pattern.lastIndex });
        index.set(key, definitions);
    }
    return index;
}

function findIndexedIndirectInteger(text, reference, state, objectDefinitionIndex, resolutionState) {
    resolutionState.references += 1;
    if (resolutionState.references > MAX_INDIRECT_LENGTH_REFERENCES) return null;

    const key = referenceKey(reference);
    if (resolutionState.cache.has(key)) return resolutionState.cache.get(key);

    const definitions = objectDefinitionIndex.get(key) || [];
    if (definitions.length !== 1) return null;

    const candidate = definitions[0];
    const remainingValueBytes = MAX_TOTAL_INDIRECT_LENGTH_VALUE_BYTES - resolutionState.valueBytes;
    if (remainingValueBytes < 1) return null;
    const valueLimit = Math.min(
        text.length,
        candidate.valueStart + Math.min(MAX_INDIRECT_OBJECT_VALUE_BYTES, remainingValueBytes)
    );
    state.nodes += 1;
    if (state.nodes > MAX_PDF_VALUE_NODES) return null;
    const valueToken = readPdfToken(text, candidate.valueStart, valueLimit);
    if (!valueToken || valueToken.kind === "eof" || valueToken.kind !== "word"
        || !/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(valueToken.value)) return null;
    const lengthValue = Number(valueToken.value);
    if (!Number.isSafeInteger(lengthValue) || lengthValue < 0 || lengthValue > MAX_PDF_INPUT_BYTES) return null;

    const endToken = readPdfToken(text, valueToken.end, valueLimit);
    if (endToken?.kind !== "word" || endToken.value !== "endobj") return null;

    const valueBytes = endToken.end - candidate.valueStart;
    if (valueBytes < 1 || valueBytes > remainingValueBytes) return null;
    resolutionState.valueBytes += valueBytes;
    const resolved = {
        value: lengthValue,
        headerOffset: candidate.headerOffset,
        valueStart: candidate.valueStart,
        valueEnd: endToken.start,
    };
    resolutionState.cache.set(key, resolved);
    return resolved;
}

function scanPdfStructure(buffer, text, state, objectDefinitionIndex) {
    const objectRecords = [];
    const streams = [];
    const lengthReferences = [];
    const lengthResolutionState = { references: 0, valueBytes: 0, cache: new Map() };
    let currentObject = null;
    let recentTokens = [];
    let position = 0;
    let tokenCount = 0;

    while (position < text.length) {
        const token = readPdfToken(text, position, text.length);
        if (!token) return null;
        if (token.kind === "eof") break;
        position = token.end;
        tokenCount += 1;
        if (tokenCount > MAX_PDF_TOKENS) return null;

        if (token.kind === "word" && token.value === "obj") {
            if (currentObject || recentTokens.length < 2) return null;
            const objectNumber = parseIntegerToken(recentTokens[recentTokens.length - 2]);
            const generation = parseIntegerToken(recentTokens[recentTokens.length - 1]);
            if (objectNumber === null || objectNumber <= 0 || generation === null
                || generation < 0 || generation > 65535) return null;
            currentObject = {
                objectNumber,
                generation,
                headerOffset: recentTokens[recentTokens.length - 2].start,
                valueStart: token.end,
                hasStream: false,
            };
            recentTokens = [];
            if (objectRecords.length >= MAX_PDF_OBJECTS) return null;
            continue;
        }

        if (token.kind === "word" && token.value === "endobj") {
            if (!currentObject) return null;
            currentObject.valueEnd = token.start;
            objectRecords.push(currentObject);
            currentObject = null;
            recentTokens = [];
            continue;
        }

        if (token.kind === "word" && token.value === "endstream") return null;

        if (token.kind === "word" && token.value === "stream") {
            if (!currentObject || currentObject.hasStream || streams.length >= MAX_PDF_STREAMS_TO_INSPECT) return null;
            if (token.start - currentObject.valueStart > MAX_STREAM_DICTIONARY_BYTES) return null;
            const dictionary = parsePdfValueExactly(text, currentObject.valueStart, token.start, state);
            if (!dictionary || dictionary.kind !== "dict") return null;
            const entries = dictionary.entries;
            if (Object.prototype.hasOwnProperty.call(entries, "F")
                || Object.prototype.hasOwnProperty.call(entries, "FFilter")
                || Object.prototype.hasOwnProperty.call(entries, "FDecodeParms")) return null;
            if (!Object.prototype.hasOwnProperty.call(entries, "Length")) return null;

            let streamLength;
            let lengthReference = null;
            if (entries.Length.kind === "number" && entries.Length.integer) {
                streamLength = entries.Length.value;
            } else if (entries.Length.kind === "ref") {
                const resolvedLength = findIndexedIndirectInteger(
                    text,
                    entries.Length,
                    state,
                    objectDefinitionIndex,
                    lengthResolutionState
                );
                if (!resolvedLength) return null;
                streamLength = resolvedLength.value;
                lengthReference = {
                    reference: entries.Length,
                    headerOffset: resolvedLength.headerOffset,
                    valueStart: resolvedLength.valueStart,
                    valueEnd: resolvedLength.valueEnd,
                    value: resolvedLength.value,
                };
            } else {
                return null;
            }
            if (!Number.isSafeInteger(streamLength) || streamLength < 0
                || streamLength > MAX_PDF_INPUT_BYTES) return null;

            let dataStart = token.end;
            if (text.startsWith("\r\n", dataStart)) dataStart += 2;
            else if (text[dataStart] === "\n" || text[dataStart] === "\r") dataStart += 1;
            else return null;
            const dataEnd = dataStart + streamLength;
            if (dataEnd > text.length) return null;

            let markerStart = dataEnd;
            let separatorBytes = 0;
            while (markerStart < text.length && isPdfWhitespace(text.charCodeAt(markerStart)) && separatorBytes < 64) {
                markerStart += 1;
                separatorBytes += 1;
            }
            if (!text.startsWith("endstream", markerStart)) return null;
            const afterMarker = text.charCodeAt(markerStart + 9);
            if (markerStart + 9 < text.length
                && !isPdfWhitespace(afterMarker) && !isPdfDelimiter(afterMarker)) return null;

            streams.push({
                dictionary,
                raw: buffer.subarray(dataStart, dataEnd),
                lengthReference,
                streamStart: dataStart,
                streamEnd: dataEnd,
            });
            if (lengthReference) lengthReferences.push(lengthReference);
            currentObject.hasStream = true;
            position = markerStart + 9;
            recentTokens = [];
            continue;
        }

        recentTokens.push(token);
        if (recentTokens.length > 2) recentTokens.shift();
    }

    if (currentObject) return null;
    return { objectRecords, streams, lengthReferences };
}

function createObjectIndex(objectRecords) {
    const index = new Map();
    for (const record of objectRecords) {
        const key = String(record.objectNumber) + ":" + String(record.generation);
        const entries = index.get(key) || [];
        entries.push(record);
        index.set(key, entries);
    }
    return index;
}

function parseIndirectObjectValue(record, text, state) {
    if (!record || record.hasStream || record.valueEnd - record.valueStart > MAX_INDIRECT_OBJECT_VALUE_BYTES) return null;
    return parsePdfValueExactly(text, record.valueStart, record.valueEnd, state);
}

function validateLengthReferences(lengthReferences, objectIndex) {
    for (const entry of lengthReferences) {
        const matches = objectIndex.get(referenceKey(entry.reference)) || [];
        if (matches.length !== 1
            || matches[0].hasStream
            || matches[0].headerOffset !== entry.headerOffset
            || matches[0].valueStart !== entry.valueStart
            || matches[0].valueEnd !== entry.valueEnd) return false;
    }
    return true;
}

function isPdfName(value, expected) {
    return value?.kind === "name" && value.value === expected;
}

function collectDictionaryKeyValues(value, key, matches = []) {
    if (!value) return matches;
    if (value.kind === "array") {
        for (const item of value.items) collectDictionaryKeyValues(item, key, matches);
    } else if (value.kind === "dict") {
        for (const [entryKey, item] of Object.entries(value.entries)) {
            if (entryKey === key) matches.push(item);
            collectDictionaryKeyValues(item, key, matches);
        }
    }
    return matches;
}

function getStreamForObject(record, streams) {
    const matches = streams.filter((stream) => stream.streamStart >= record.valueStart
        && stream.streamEnd <= record.valueEnd);
    return matches.length === 1 ? matches[0] : null;
}

function validateEmbeddedFileAttachments(structure, text, state) {
    const objects = [];
    const attachmentSyntax = /\/(?:Type\s*\/(?:Catalog|Filespec|EmbeddedFile)\b|EmbeddedFiles?\b|EF\b|AFRelationship\b)/;
    const embeddedNameMatches = [...decodePdfNameEscapes(text).matchAll(EMBEDDED_PDF_NAMES)];

    for (const record of structure.objectRecords) {
        if (record.hasStream) {
            const stream = getStreamForObject(record, structure.streams);
            if (!stream) return false;
            objects.push({ record, value: stream.dictionary, stream });
            continue;
        }

        const objectText = text.slice(record.valueStart, record.valueEnd);
        if (!attachmentSyntax.test(decodePdfNameEscapes(objectText))) continue;

        const value = parseIndirectObjectValue(record, text, state);
        if (!value) return false;
        if (value.kind === "dict") objects.push({ record, value, stream: null });
    }

    const fileSpecs = objects.filter(({ value }) => isPdfName(value.entries.Type, "Filespec")
        || Object.prototype.hasOwnProperty.call(value.entries, "EF"));
    const embeddedStreams = objects.filter(({ stream, value }) => stream
        && isPdfName(value.entries.Type, "EmbeddedFile"));
    const embeddedFileNames = objects.flatMap(({ value }) => collectDictionaryKeyValues(value, "EmbeddedFiles"));
    const embeddedFileReferences = objects.flatMap(({ value }) => collectDictionaryKeyValues(value, "EF"));
    const associatedFiles = objects.flatMap(({ value }) => collectDictionaryKeyValues(value, "AF"));
    const embeddedTypes = objects.flatMap(({ value }) => collectDictionaryKeyValues(value, "Type"))
        .filter((value) => isPdfName(value, "EmbeddedFile"));

    if (fileSpecs.length === 0 && embeddedStreams.length === 0
        && embeddedFileNames.length === 0 && embeddedFileReferences.length === 0) {
        return embeddedNameMatches.length === 0;
    }

    // C2PA stores its non-executable provenance manifest in an embedded file
    // stream. Accept only the single, document-level form validated below;
    // ordinary or additional embedded files remain rejected.
    if (fileSpecs.length !== 1 || embeddedStreams.length !== 1
        || embeddedFileNames.length !== 1 || embeddedFileReferences.length !== 1
        || associatedFiles.length !== 1 || embeddedTypes.length !== 1
        || embeddedNameMatches.length !== 2) return false;

    const fileSpec = fileSpecs[0];
    const fileSpecEntries = fileSpec.value.entries;
    if (!isPdfName(fileSpecEntries.Type, "Filespec")
        || !isPdfName(fileSpecEntries.AFRelationship, "C2PA_Manifest")
        || fileSpecEntries.EF?.kind !== "dict"
        || Object.keys(fileSpecEntries.EF.entries).length !== 1
        || !Object.prototype.hasOwnProperty.call(fileSpecEntries.EF.entries, "F")) return false;

    const embeddedReference = fileSpecEntries.EF.entries.F;
    if (embeddedReference.kind !== "ref") return false;

    const embeddedStream = embeddedStreams[0];
    if (embeddedStream.record.objectNumber !== embeddedReference.objectNumber
        || embeddedStream.record.generation !== embeddedReference.generation) return false;

    const streamEntries = embeddedStream.value.entries;
    if (!isPdfName(streamEntries.Subtype, "application/c2pa")
        || Object.prototype.hasOwnProperty.call(streamEntries, "Filter")
        || Object.prototype.hasOwnProperty.call(streamEntries, "DecodeParms")
        || Object.prototype.hasOwnProperty.call(streamEntries, "DP")) return false;

    const streamBytes = embeddedStream.stream.raw;
    if (streamBytes.length < 8
        || streamBytes.readUInt32BE(0) !== streamBytes.length
        || streamBytes.toString("latin1", 4, 8) !== "jumb") return false;

    const fileSpecKey = referenceKey({
        objectNumber: fileSpec.record.objectNumber,
        generation: fileSpec.record.generation,
    });
    let matchingCatalogs = 0;
    for (const { value } of objects) {
        if (!isPdfName(value.entries.Type, "Catalog")) continue;
        const hasAssociatedFiles = Object.prototype.hasOwnProperty.call(value.entries, "AF");
        const names = value.entries.Names;
        const embeddedTree = names?.kind === "dict" ? names.entries.EmbeddedFiles : null;
        const hasEmbeddedTree = Boolean(embeddedTree);
        if (!hasAssociatedFiles && !hasEmbeddedTree) continue;
        if (!hasAssociatedFiles || !hasEmbeddedTree
            || value.entries.AF.kind !== "array"
            || value.entries.AF.items.length !== 1
            || value.entries.AF.items[0].kind !== "ref"
            || referenceKey(value.entries.AF.items[0]) !== fileSpecKey
            || embeddedTree.kind !== "dict"
            || embeddedTree.entries.Names?.kind !== "array"
            || embeddedTree.entries.Names.items.length !== 2
            || embeddedTree.entries.Names.items[0].kind !== "string"
            || embeddedTree.entries.Names.items[1].kind !== "ref"
            || referenceKey(embeddedTree.entries.Names.items[1]) !== fileSpecKey) return false;
        matchingCatalogs += 1;
    }

    return matchingCatalogs === 1;
}

function resolvePdfObjectReferences(value, context, referenceTrail = new Set(), depth = 0) {
    if (depth > MAX_FILTER_REFERENCE_DEPTH) return null;

    if (value.kind === "ref") {
        context.references += 1;
        if (context.references > MAX_FILTER_REFERENCES) return null;
        const key = referenceKey(value);
        if (referenceTrail.has(key)) return null;
        const records = context.objectIndex.get(key) || [];
        if (records.length !== 1) return null;
        const target = parseIndirectObjectValue(records[0], context.text, context.state);
        if (!target) return null;
        const nextTrail = new Set(referenceTrail);
        nextTrail.add(key);
        return resolvePdfObjectReferences(target, context, nextTrail, depth + 1);
    }

    if (value.kind === "array") {
        const items = [];
        for (const item of value.items) {
            const resolved = resolvePdfObjectReferences(item, context, new Set(referenceTrail), depth + 1);
            if (!resolved) return null;
            items.push(resolved);
        }
        return { kind: "array", items };
    }

    if (value.kind === "dict") {
        const entries = Object.create(null);
        for (const [key, item] of Object.entries(value.entries)) {
            const resolved = resolvePdfObjectReferences(item, context, new Set(referenceTrail), depth + 1);
            if (!resolved) return null;
            entries[key] = resolved;
        }
        return { kind: "dict", entries };
    }

    return value;
}

function resolveFilterNames(filterValue, context) {
    const resolved = resolvePdfObjectReferences(filterValue, context);
    if (!resolved) return null;
    if (resolved.kind === "name") return [resolved.value];
    if (resolved.kind !== "array" || resolved.items.length > MAX_FILTERS_PER_STREAM) return null;

    const filters = [];
    for (const item of resolved.items) {
        if (item.kind !== "name") return null;
        filters.push(item.value);
    }
    return filters;
}

function resolveDecodeParameters(value, filterCount, context) {
    if (!value) return Array(filterCount).fill(null);
    const resolved = resolvePdfObjectReferences(value, context);
    if (!resolved) return null;
    if (resolved.kind === "null") return Array(filterCount).fill(null);
    if (resolved.kind === "dict" && filterCount === 1) return [resolved];
    if (resolved.kind !== "array" || resolved.items.length !== filterCount) return null;
    if (resolved.items.some((item) => item.kind !== "null" && item.kind !== "dict")) return null;
    return resolved.items;
}

function validateDecodeParameters(filterName, parameters) {
    if (parameters === null) return true;
    const canonical = filterName === "Fl" ? "FlateDecode"
        : filterName === "AHx" ? "ASCIIHexDecode"
            : filterName === "A85" ? "ASCII85Decode"
                : filterName;
    if (canonical !== "FlateDecode" || parameters.kind !== "dict") return false;

    const allowedKeys = new Set(["Predictor", "Colors", "BitsPerComponent", "Columns"]);
    for (const key of Object.keys(parameters.entries)) {
        if (!allowedKeys.has(key)) return false;
        const value = parameters.entries[key];
        if (value.kind !== "number" || !value.integer || value.value < 1 || value.value > 65536) return false;
    }
    const predictor = parameters.entries.Predictor;
    return !predictor || predictor.value === 1;
}

function decodeAsciiHexPass(buffer, maxOutputBytes, output) {
    let outputLength = 0;
    let highNibble = -1;
    let ended = false;

    function writeByte(value) {
        if (outputLength >= maxOutputBytes || (output && outputLength >= output.length)) return false;
        if (output) output[outputLength] = value;
        outputLength += 1;
        return true;
    }

    for (let index = 0; index < buffer.length; index += 1) {
        const code = buffer[index];
        if (isPdfWhitespace(code)) continue;
        if (ended) return null;
        if (code === 62) {
            ended = true;
            continue;
        }

        let nibble;
        if (code >= 48 && code <= 57) nibble = code - 48;
        else if (code >= 65 && code <= 70) nibble = code - 55;
        else if (code >= 97 && code <= 102) nibble = code - 87;
        else return null;

        if (highNibble === -1) {
            highNibble = nibble;
        } else {
            if (!writeByte((highNibble << 4) | nibble)) return null;
            highNibble = -1;
        }
    }

    if (highNibble !== -1) {
        if (!writeByte(highNibble << 4)) return null;
    }
    return outputLength;
}

function decodeAsciiHex(buffer, maxOutputBytes) {
    // Validate and count first so rejected or mostly-whitespace input does not
    // trigger an allocation sized from the encoded input.
    const outputLength = decodeAsciiHexPass(buffer, maxOutputBytes, null);
    if (outputLength === null) return null;
    const output = Buffer.allocUnsafe(outputLength);
    if (decodeAsciiHexPass(buffer, maxOutputBytes, output) !== outputLength) return null;
    return output;
}

function decodeAscii85Pass(buffer, maxOutputBytes, output) {
    let outputLength = 0;
    let group = [];
    let index = 0;

    while (index < buffer.length && isPdfWhitespace(buffer[index])) index += 1;
    if (buffer[index] === 60) {
        if (buffer[index + 1] !== 126) return null;
        index += 2;
    }

    function writeByte(value) {
        if (outputLength >= maxOutputBytes || (output && outputLength >= output.length)) return false;
        if (output) output[outputLength] = value;
        outputLength += 1;
        return true;
    }

    function writeGroup(values, byteCount) {
        let value = 0n;
        for (const digit of values) value = value * 85n + BigInt(digit);
        if (value > 0xffffffffn) return false;
        const bytes = [
            Number((value >> 24n) & 255n),
            Number((value >> 16n) & 255n),
            Number((value >> 8n) & 255n),
            Number(value & 255n),
        ];
        for (const byte of bytes.slice(0, byteCount)) {
            if (!writeByte(byte)) return false;
        }
        return true;
    }

    while (index < buffer.length) {
        const code = buffer[index];
        if (isPdfWhitespace(code)) {
            index += 1;
            continue;
        }
        if (code === 126) {
            if (buffer[index + 1] !== 62) return null;
            index += 2;
            while (index < buffer.length) {
                if (!isPdfWhitespace(buffer[index])) return null;
                index += 1;
            }
            break;
        }
        if (code === 122) {
            if (group.length !== 0) return null;
            if (!writeByte(0) || !writeByte(0) || !writeByte(0) || !writeByte(0)) return null;
            index += 1;
            continue;
        }
        if (code < 33 || code > 117) return null;
        group.push(code - 33);
        index += 1;
        if (group.length === 5) {
            if (!writeGroup(group, 4)) return null;
            group = [];
        }
    }

    if (group.length === 1) return null;
    if (group.length > 1) {
        const byteCount = group.length - 1;
        while (group.length < 5) group.push(84);
        if (!writeGroup(group, byteCount)) return null;
    }
    return outputLength;
}

function decodeAscii85(buffer, maxOutputBytes) {
    // ASCII85 can expand substantially. Count and validate before allocating
    // the exact decoded size, while enforcing the same cap in both passes.
    const outputLength = decodeAscii85Pass(buffer, maxOutputBytes, null);
    if (outputLength === null) return null;
    const output = Buffer.allocUnsafe(outputLength);
    if (decodeAscii85Pass(buffer, maxOutputBytes, output) !== outputLength) return null;
    return output;
}

function decodeStream(buffer, filters, parameters, maxOutputBytes) {
    let decoded = buffer;
    for (let index = 0; index < filters.length; index += 1) {
        const filter = filters[index];
        const remainingLimit = Math.min(MAX_DECOMPRESSED_STREAM_BYTES, maxOutputBytes);
        if (remainingLimit < 1 && decoded.length > 0) return null;

        if (filter === "ASCII85Decode" || filter === "A85") {
            decoded = decodeAscii85(decoded, remainingLimit);
        } else if (filter === "ASCIIHexDecode" || filter === "AHx") {
            decoded = decodeAsciiHex(decoded, remainingLimit);
        } else if (filter === "FlateDecode" || filter === "Fl") {
            try {
                decoded = zlib.inflateSync(decoded, { maxOutputLength: Math.max(1, remainingLimit) });
                if (decoded.length > remainingLimit) return null;
            } catch {
                return null;
            }
        } else {
            return null;
        }
        if (!decoded) return null;
    }
    if (decoded.length > maxOutputBytes || decoded.length > MAX_DECOMPRESSED_STREAM_BYTES) return null;
    return decoded;
}

function containsActivePdfContent(buffer, allowValidatedEmbeddedFileNames = false) {
    const names = decodePdfNameEscapes(buffer.toString("latin1"));
    return (allowValidatedEmbeddedFileNames ? ACTIVE_PDF_NAMES_WITHOUT_EMBEDDED_FILES : ACTIVE_PDF_NAMES).test(names);
}

function isSafePdfBuffer(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12 || buffer.length > MAX_PDF_INPUT_BYTES) return false;

    const head = buffer.subarray(0, 1024).toString("latin1");
    const tail = buffer.subarray(Math.max(0, buffer.length - 2048)).toString("latin1");
    if (!head.includes("%PDF-") || !/%%EOF[\x00\t\n\f\r ]*$/.test(tail)) return false;

    const text = buffer.toString("latin1");
    if (!/\bxref\b/.test(text) && !/\/Type\s*\/XRef\b/.test(text)) return false;
    if (containsActivePdfContent(buffer, true)) return false;

    const state = { nodes: 0 };
    const objectDefinitionIndex = createObjectDefinitionIndex(text);
    if (!objectDefinitionIndex) return false;
    const structure = scanPdfStructure(buffer, text, state, objectDefinitionIndex);
    if (!structure || structure.objectRecords.length === 0) return false;

    if (!validateEmbeddedFileAttachments(structure, text, state)) return false;

    const objectIndex = createObjectIndex(structure.objectRecords);
    if (!validateLengthReferences(structure.lengthReferences, objectIndex)) return false;

    const context = { text, objectIndex, state, references: 0 };
    let totalDecodedBytes = 0;
    for (const stream of structure.streams) {
        const entries = stream.dictionary.entries;
        const hasFilter = Object.prototype.hasOwnProperty.call(entries, "Filter");
        let filters = [];
        if (hasFilter) {
            filters = resolveFilterNames(entries.Filter, context);
            if (!filters) return false;
        }
        if (filters.length > MAX_FILTERS_PER_STREAM) return false;

        const hasDecodeParms = Object.prototype.hasOwnProperty.call(entries, "DecodeParms");
        const hasAbbreviatedDecodeParms = Object.prototype.hasOwnProperty.call(entries, "DP");
        if (hasDecodeParms && hasAbbreviatedDecodeParms) return false;
        const decodeParmsValue = hasDecodeParms ? entries.DecodeParms
            : hasAbbreviatedDecodeParms ? entries.DP
                : null;
        const parameters = resolveDecodeParameters(decodeParmsValue, filters.length, context);
        if (!parameters) return false;

        for (let index = 0; index < filters.length; index += 1) {
            if (!validateDecodeParameters(filters[index], parameters[index])) return false;
        }

        const remainingTotal = MAX_TOTAL_DECOMPRESSED_BYTES - totalDecodedBytes;
        if (remainingTotal < 0) return false;
        const decoded = decodeStream(stream.raw, filters, parameters, remainingTotal);
        if (!decoded) return false;
        totalDecodedBytes += decoded.length;
        if (totalDecodedBytes > MAX_TOTAL_DECOMPRESSED_BYTES) return false;
        if (containsActivePdfContent(decoded)) return false;
    }
    return true;
}

module.exports = { isSafePdfBuffer };

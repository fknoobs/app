import fs from 'fs';
const logger = console; // Using console for logging as in the original JS

// Placeholder for Settings and UCS classes/functionality if needed later
// import { Settings } from './classes/oppbot_settings.js'; // Assuming path
// import { UCS } from './classes/oppbot_ucs.js'; // Assuming path

class ReplayParser {
	constructor(filePath = null, settings = null) {
		// this.settings = settings || new Settings(); // Uncomment if Settings class is available
		this.settings = settings || {}; // Using placeholder

		this.filePath = filePath;

		this.fileVersion = null;
		this.chunkyVersion = null;
		this.randomStart = null;
		this.highResources = null;
		this.VPCount = null;
		this.matchType = null;
		this.localDateString = null;
		this.localDate = null;
		this.unknownDate = null;
		this.replayName = null;
		this.gameVersion = null;
		this.modName = null;
		this.mapName = null;
		this.mapNameFull = null; // Needs UCS resolution
		this.mapDescription = null;
		this.mapDescriptionFull = null; // Needs UCS resolution
		this.mapFileName = null;
		this.mapWidth = null;
		this.mapHeight = null;
		this.playerList = [];
		this.VPGame = null; // Added from Python version
		this.chunkyHeaderLength = null; // Added from Python version

		this.success = null;

		this.data = null; // Will hold the Buffer
		this.dataIndex = 0;

		if (filePath) {
			this.load(filePath);
		}
	}

	/**
	 * Reads 4 bytes as an unsigned long int (little-endian).
	 * @returns {number | undefined}
	 */
	readUnsignedLong4Bytes() {
		try {
			if (this.data && this.dataIndex + 4 <= this.data.length) {
				const value = this.data.readUInt32LE(this.dataIndex);
				this.dataIndex += 4;
				return value;
			} else if (this.data) {
				throw new Error(`Buffer overrun trying to read 4 bytes at index ${this.dataIndex}`);
			}
		} catch (err) {
			logger.error(err.message);
			logger.error(`Failed to read 4 bytes at index ${this.dataIndex}`);
			this.success = false;
		}
		return undefined; // Return undefined on failure or if no data
	}

	/**
	 * Reads a number of bytes from the data buffer.
	 * @param {number} numberOfBytes
	 * @returns {Buffer | undefined}
	 */
	readBytes(numberOfBytes) {
		try {
			if (this.data && this.dataIndex + numberOfBytes <= this.data.length) {
				const output = this.data.slice(this.dataIndex, this.dataIndex + numberOfBytes);
				this.dataIndex += numberOfBytes;
				return output;
			} else if (this.data) {
				throw new Error(
					`Buffer overrun trying to read ${numberOfBytes} bytes at index ${this.dataIndex}`
				);
			}
		} catch (err) {
			logger.error(err.message);
			logger.error(`Failed to read ${numberOfBytes} bytes at index ${this.dataIndex}`);
			this.success = false;
		}
		return undefined;
	}

	/**
	 * Reads a length-prefixed UTF-16LE string.
	 * @returns {string | undefined}
	 */
	readLengthString() {
		try {
			const stringLength = this.readUnsignedLong4Bytes();
			if (stringLength === undefined || !this.success) return undefined;
			return this.read2ByteString(stringLength);
		} catch (err) {
			logger.error(err.message);
			logger.error('Failed to read a length-prefixed UTF-16LE string');
			this.success = false;
		}
		return undefined;
	}

	/**
	 * Reads a UTF-16LE string of a specified character length.
	 * @param {number} stringLength - Number of characters (not bytes).
	 * @returns {string | undefined}
	 */
	read2ByteString(stringLength = 0) {
		try {
			const numBytes = stringLength * 2;
			if (this.data && this.dataIndex + numBytes <= this.data.length) {
				const bytes = this.data.slice(this.dataIndex, this.dataIndex + numBytes);
				this.dataIndex += numBytes;
				return bytes.toString('utf16le');
			} else if (this.data) {
				throw new Error(
					`Buffer overrun trying to read ${numBytes} bytes for UTF-16LE string at index ${this.dataIndex}`
				);
			}
		} catch (err) {
			logger.error(err.message);
			logger.error(
				`Failed to read a UTF-16LE string of length ${stringLength} at index ${this.dataIndex}`
			);
			this.success = false;
		}
		return undefined;
	}

	/**
	 * Reads a length-prefixed ASCII string.
	 * @returns {string | undefined}
	 */
	readLengthASCIIString() {
		try {
			const stringLength = this.readUnsignedLong4Bytes();
			if (stringLength === undefined || !this.success) return undefined;
			return this.readASCIIString(stringLength);
		} catch (err) {
			logger.error(err.message);
			logger.error('Failed to read a length-prefixed ASCII string');
			this.success = false;
		}
		return undefined;
	}

	/**
	 * Reads an ASCII string of a specified length.
	 * Tries UTF-16LE as a fallback if ASCII decoding fails.
	 * @param {number} stringLength - Number of bytes/characters.
	 * @returns {string | undefined}
	 */
	readASCIIString(stringLength = 0) {
		try {
			if (this.data && this.dataIndex + stringLength <= this.data.length) {
				const bytes = this.data.slice(this.dataIndex, this.dataIndex + stringLength);
				this.dataIndex += stringLength;
				try {
					// First try ASCII
					return bytes.toString('ascii');
				} catch (decodeError) {
					// Fallback for potential UCS2/UTF16LE cases found in Python version
					logger.warn(
						`ASCII decode failed at index ${this.dataIndex - stringLength}, attempting UTF-16LE fallback.`
					);
					// Reset index and try reading as 2-byte string if length is even
					this.dataIndex -= stringLength;
					if (stringLength % 2 === 0) {
						return this.read2ByteString(stringLength / 2);
					} else {
						// If length is odd, UTF16 is unlikely, re-throw original error conceptually
						throw new Error(`Cannot decode as ASCII or UTF-16LE (odd length: ${stringLength})`);
					}
				}
			} else if (this.data) {
				throw new Error(
					`Buffer overrun trying to read ${stringLength} bytes for ASCII string at index ${this.dataIndex}`
				);
			}
		} catch (err) {
			logger.error(err.message);
			logger.error(
				`Failed to read an ASCII string of length ${stringLength} at index ${this.dataIndex}`
			);
			this.success = false;
		}
		return undefined;
	}

	/**
	 * Reads a null-terminated UTF-16LE string.
	 * @returns {string | undefined}
	 */
	readNullTerminated2ByteString() {
		try {
			if (this.data) {
				let characters = '';
				while (this.dataIndex + 2 <= this.data.length) {
					const word = this.data.readUInt16LE(this.dataIndex);
					this.dataIndex += 2;
					if (word === 0x0000) {
						// Null terminator (2 bytes)
						return characters;
					}
					characters += String.fromCharCode(word);
				}
				// Reached end of buffer without null terminator
				throw new Error(
					`Buffer overrun searching for null terminator in UTF-16LE string starting near index ${this.dataIndex}`
				);
			}
		} catch (err) {
			logger.error(err.message);
			logger.error('Failed to read a null-terminated UTF-16LE string');
			this.success = false;
		}
		return undefined;
	}

	/**
	 * Reads a null-terminated ASCII string.
	 * @returns {string | undefined}
	 */
	readNullTerminatedASCIIString() {
		try {
			if (this.data) {
				let characters = '';
				while (this.dataIndex < this.data.length) {
					const byte = this.data.readUInt8(this.dataIndex);
					this.dataIndex += 1;
					if (byte === 0x00) {
						// Null terminator (1 byte)
						return characters;
					}
					characters += String.fromCharCode(byte);
				}
				// Reached end of buffer without null terminator
				throw new Error(
					`Buffer overrun searching for null terminator in ASCII string starting near index ${this.dataIndex}`
				);
			}
		} catch (err) {
			logger.error(err.message);
			logger.error('Failed to read a null-terminated ASCII string');
			this.success = false;
		}
		return undefined;
	}

	/**
	 * Moves the data index.
	 * @param {number} numberOfBytes - The offset.
	 * @param {number} relative - 0: from start, 1: from current, 2: from end.
	 */
	seek(numberOfBytes, relative = 0) {
		try {
			numberOfBytes = parseInt(numberOfBytes, 10);
			relative = parseInt(relative, 10);
			let newIndex;

			if (relative === 0) {
				// SEEK_SET
				newIndex = numberOfBytes;
			} else if (relative === 1) {
				// SEEK_CUR
				newIndex = this.dataIndex + numberOfBytes;
			} else if (relative === 2) {
				// SEEK_END
				newIndex = this.data.length - numberOfBytes;
			} else {
				throw new Error(`Invalid relative value: ${relative}`);
			}

			if (newIndex >= 0 && newIndex <= this.data.length) {
				this.dataIndex = newIndex;
			} else {
				throw new Error(
					`Seek out of bounds: tried to set index to ${newIndex} (buffer length ${this.data.length})`
				);
			}
		} catch (err) {
			logger.error(err.message);
			logger.error(
				`Failed to move data index by ${numberOfBytes} bytes (relative=${relative}) from index ${this.dataIndex}`
			);
			this.success = false; // Setting success to false on seek failure might be too strict depending on usage
		}
	}

	/**
	 * Loads replay data from a file path.
	 * @param {string} filePath
	 */
	load(filePath = '') {
		try {
			this.filePath = filePath;
			this.data = fs.readFileSync(filePath);
			this.dataIndex = 0; // Reset index
			this.processData();
		} catch (err) {
			logger.error(`Failed to load file: ${filePath}`);
			logger.error(err.message);
			this.success = false;
			this.data = null;
		}
	}

	/**
	 * Processes the loaded replay data.
	 * @returns {boolean} - True if processing was successful (so far), false otherwise.
	 */
	processData() {
		this.success = true; // Assume success until an error occurs

		this.fileVersion = this.readUnsignedLong4Bytes();
		if (!this.success) return false;

		this.readASCIIString(8); // "COH__REC"
		if (!this.success) return false;

		this.localDateString = this.readNullTerminated2ByteString();
		if (!this.success) return false;

		this.localDate = this.decodeDate(this.localDateString);
		// Don't fail if date parsing fails, just leave it null

		this.seek(76, 0); // Absolute position
		if (!this.success) return false;

		const firstRelicChunkyAddress = this.dataIndex;

		this.readASCIIString(12); // "RELICCHUNKY" (corrected from python comment)
		if (!this.success) return false;
		this.readUnsignedLong4Bytes(); // unknown
		if (!this.success) return false;
		this.chunkyVersion = this.readUnsignedLong4Bytes(); // Should be 3
		if (!this.success) return false;
		this.readUnsignedLong4Bytes(); // unknown
		if (!this.success) return false;
		this.chunkyHeaderLength = this.readUnsignedLong4Bytes();
		if (!this.success) return false;

		// Seek logic from Python:
		this.seek(firstRelicChunkyAddress, 0); // Go back to start of this chunky header
		if (!this.success) return false;
		this.seek(this.chunkyHeaderLength, 1); // Seek past the header to the first chunk (e.g., FOLDPOST)
		if (!this.success) return false;

		// The python code then seeks again based on the *first* address + 96,
		// which seems redundant if the chunkyHeaderLength seek was correct.
		// Let's replicate python logic exactly first.
		this.seek(firstRelicChunkyAddress, 0);
		if (!this.success) return false;
		this.seek(96, 1); // Seek 96 bytes from the start of the *first* chunky header
		if (!this.success) return false;
		// This should land us at the start of the *second* "RelicChunky" header

		const secondRelicChunkyAddress = this.dataIndex;

		this.readASCIIString(12); // "RELICCHUNKY"
		if (!this.success) return false;
		this.readUnsignedLong4Bytes(); // unknown
		if (!this.success) return false;
		this.readUnsignedLong4Bytes(); // chunkyVersion (should be 3 again)
		if (!this.success) return false;
		this.readUnsignedLong4Bytes(); // unknown
		if (!this.success) return false;
		const secondChunkLength = this.readUnsignedLong4Bytes(); // Length of this second chunky header
		if (!this.success) return false;

		// Seek past this second chunky header to get to the main data chunks (FOLD...)
		this.seek(secondRelicChunkyAddress, 0); // Go back to start of second chunky
		if (!this.success) return false;
		this.seek(secondChunkLength, 1); // Seek past it
		if (!this.success) return false;

		// Now parse the main FOLD chunks
		this.parseChunk(0); // Parse first main FOLD (usually FOLDPOST)
		if (!this.success) return false;
		this.parseChunk(0); // Parse second main FOLD (usually FOLD____)
		if (!this.success) return false;

		// this.resolve_mapNameFull_And_mapDescription_From_UCS(); // Needs UCS class

		return this.success;
	}

	// Placeholder for UCS resolution if implemented later
	// resolve_mapNameFull_And_mapDescription_From_UCS() {
	//     try {
	//         const ucs = new UCS({ settings: this.settings }); // Assuming UCS constructor
	//         this.mapNameFull = ucs.compare_UCS(this.mapName);
	//         this.mapDescriptionFull = ucs.compare_UCS(this.mapDescription);
	//     } catch (err) {
	//         logger.error("Failed to resolve UCS strings: " + err.message);
	//         // Decide if this should set this.success = false
	//     }
	// }

	/**
	 * Recursively parses data chunks.
	 * @param {number} level - Recursion depth (for debugging/indentation).
	 */
	parseChunk(level) {
		if (!this.success) {
			// logger.log(`${'  '.repeat(level)}Skipping chunk parse due to previous error.`); // Optional: uncomment for more verbose skipping info
			return;
		}

		const chunkStartOffset = this.dataIndex; // Remember where this chunk definition starts
		// logger.log(`${'  '.repeat(level)}Attempting to read chunk header at offset ${chunkStartOffset}`); // Debug log

		const chunkTypeBytes = this.readBytes(8); // Read type as bytes first for logging
		if (!this.success || chunkTypeBytes === undefined) {
			logger.error(`${'  '.repeat(level)}Failed to read chunk type at offset ${chunkStartOffset}`);
			this.success = false; // Ensure failure is marked
			return;
		}
		const chunkType = chunkTypeBytes.toString('ascii'); // Convert to string

		const chunkVersion = this.readUnsignedLong4Bytes();
		if (!this.success || chunkVersion === undefined) {
			logger.error(
				`${'  '.repeat(level)}Failed to read chunk version for type ${chunkType} at offset ${this.dataIndex - 4}`
			);
			return; // Success already set to false by read function
		}

		const chunkLength = this.readUnsignedLong4Bytes(); // This is the length of the DATA *within* the chunk
		if (!this.success || chunkLength === undefined) {
			logger.error(
				`${'  '.repeat(level)}Failed to read chunk data length for type ${chunkType} v${chunkVersion} at offset ${this.dataIndex - 4}`
			);
			return;
		}

		const chunkNameLength = this.readUnsignedLong4Bytes();
		if (!this.success || chunkNameLength === undefined) {
			logger.error(
				`${'  '.repeat(level)}Failed to read chunk name length for type ${chunkType} v${chunkVersion} at offset ${this.dataIndex - 4}`
			);
			return;
		}

		this.seek(8, 1); // Skip 8 unknown/padding bytes
		if (!this.success) {
			logger.error(
				`${'  '.repeat(level)}Failed to seek past padding for type ${chunkType} v${chunkVersion} at offset ${this.dataIndex - 8}`
			);
			return;
		}

		let chunkName = null;
		if (chunkNameLength > 0) {
			chunkName = this.readASCIIString(chunkNameLength);
			if (!this.success) {
				logger.error(
					`${'  '.repeat(level)}Failed to read chunk name (${chunkNameLength} bytes) for type ${chunkType} v${chunkVersion}`
				);
				return; // Stop processing this chunk if name read fails
			}
		}

		const chunkHeaderSize = 28 + chunkNameLength; // 8(type)+4(ver)+4(len)+4(nameLen)+8(pad)+nameLen
		const chunkDataStart = chunkStartOffset + chunkHeaderSize;
		const expectedEndOfChunk = chunkDataStart + chunkLength; // End of data = start of data + data length

		// More detailed log entry
		logger.log(
			`${'  '.repeat(level)}Parsing Chunk: Type=${chunkType}, Version=${chunkVersion}, DataLength=${chunkLength}, NameLength=${chunkNameLength}, Name=${chunkName || 'N/A'}, HeaderStart=${chunkStartOffset}, DataStart=${chunkDataStart}, ExpectedEnd=${expectedEndOfChunk}, CurrentIndex=${this.dataIndex}`
		);
		if (this.dataIndex !== chunkDataStart) {
			logger.warn(
				`${'  '.repeat(level)} >> Current index ${this.dataIndex} does not match calculated data start ${chunkDataStart}!`
			);
		}

		try {
			// Recurse into FOLD chunks
			if (chunkType.startsWith('FOLD')) {
				logger.log(
					`${'  '.repeat(level)}Entering FOLD chunk. Current index: ${this.dataIndex}, Expected end: ${expectedEndOfChunk}`
				);
				while (this.dataIndex < expectedEndOfChunk && this.success) {
					const currentPosBeforeSubChunk = this.dataIndex;
					this.parseChunk(level + 1);
					// Check if parseChunk failed and didn't advance index, prevent infinite loop
					if (!this.success || this.dataIndex === currentPosBeforeSubChunk) {
						logger.error(
							`${'  '.repeat(level)}Sub-chunk parsing failed or did not advance index. Breaking FOLD loop. Index: ${this.dataIndex}`
						);
						if (this.success && this.dataIndex === currentPosBeforeSubChunk) {
							// If success is true but index didn't change, it means an empty or unhandled chunk was parsed.
							// Avoid infinite loop by forcing failure or seeking past manually. Let's mark failure.
							this.success = false;
						}
						break;
					}
				}
				// Check if recursion finished correctly or stopped early
				if (this.dataIndex !== expectedEndOfChunk && this.success) {
					logger.warn(
						`${'  '.repeat(level)}FOLD chunk ${chunkType} parsing finished at ${this.dataIndex}, but expected end was ${expectedEndOfChunk}. Seeking to expected end.`
					);
					this.seek(expectedEndOfChunk, 0); // Force seek
				} else if (!this.success) {
					logger.error(
						`${'  '.repeat(level)}FOLD chunk ${chunkType} parsing failed. Index: ${this.dataIndex}, Expected end: ${expectedEndOfChunk}`
					);
					// Attempt to seek to end anyway to potentially recover for sibling chunks
					if (this.data && expectedEndOfChunk <= this.data.length) {
						this.seek(expectedEndOfChunk, 0);
						// Keep success as false to indicate overall failure, but allow parsing siblings
						logger.warn(
							`${'  '.repeat(level)}Attempted recovery seek to ${expectedEndOfChunk} after FOLD error.`
						);
					}
				} else {
					logger.log(
						`${'  '.repeat(level)}Successfully parsed FOLD chunk ${chunkType}. Index reached expected end: ${this.dataIndex}`
					);
				}
			}
			// Parse specific DATA chunks based on type and version
			else if (chunkType === 'DATASDSC' && chunkVersion === 2004) {
				logger.log(
					`${'  '.repeat(level)}Parsing DATASDSC v${chunkVersion} - Start Index: ${this.dataIndex}`
				);
				this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After unknown1: ${this.dataIndex}`);
				this.unknownDate = this.readLengthString();
				logger.log(
					`${'  '.repeat(level)}  After unknownDate (${this.unknownDate?.length}): ${this.dataIndex}`
				);
				this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After unknown2: ${this.dataIndex}`);
				this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After unknown3: ${this.dataIndex}`);
				this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After unknown4: ${this.dataIndex}`);
				this.modName = this.readLengthASCIIString();
				logger.log(
					`${'  '.repeat(level)}  After modName (${this.modName?.length}): ${this.dataIndex}`
				);
				this.mapFileName = this.readLengthASCIIString();
				logger.log(
					`${'  '.repeat(level)}  After mapFileName (${this.mapFileName?.length}): ${this.dataIndex}`
				);
				this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After unknown5: ${this.dataIndex}`);
				this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After unknown6: ${this.dataIndex}`);
				this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After unknown7: ${this.dataIndex}`);
				this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After unknown8: ${this.dataIndex}`);
				this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After unknown9: ${this.dataIndex}`);
				this.mapName = this.readLengthString();
				logger.log(
					`${'  '.repeat(level)}  After mapName (${this.mapName?.length}): ${this.dataIndex}`
				);

				const value = this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After value read (${value}): ${this.dataIndex}`);
				if (this.success && value !== undefined && value !== 0) {
					logger.log(`${'  '.repeat(level)}  Reading unknown string of length ${value}`);
					this.read2ByteString(value);
					logger.log(`${'  '.repeat(level)}  After unknown string: ${this.dataIndex}`);
				}
				this.mapDescription = this.readLengthString();
				logger.log(
					`${'  '.repeat(level)}  After mapDescription (${this.mapDescription?.length}): ${this.dataIndex}`
				);
				this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After unknown10: ${this.dataIndex}`);
				this.mapWidth = this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After mapWidth (${this.mapWidth}): ${this.dataIndex}`);
				this.mapHeight = this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After mapHeight (${this.mapHeight}): ${this.dataIndex}`);
				this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After unknown11: ${this.dataIndex}`);
				this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After unknown12: ${this.dataIndex}`);
				this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After unknown13: ${this.dataIndex}`);
				logger.log(
					`${'  '.repeat(level)}Finished parsing DATASDSC. Success: ${this.success}, Final Index: ${this.dataIndex}`
				);
			} else if (chunkType === 'DATABASE' && chunkVersion === 11) {
				logger.log(
					`${'  '.repeat(level)}Parsing DATABASE v${chunkVersion} - Start Index: ${this.dataIndex}`
				);
				// ... (reads before game version indicator) ...
				this.seek(16, 1);
				logger.log(`${'  '.repeat(level)}  After seek 16: ${this.dataIndex}`);
				const randomStartVal = this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After randomStartVal: ${this.dataIndex}`);
				if (this.success) this.randomStart = randomStartVal !== undefined && randomStartVal !== 0;
				this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After COLS: ${this.dataIndex}`); // COLS
				const highResVal = this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After highResVal: ${this.dataIndex}`);
				if (this.success) this.highResources = highResVal === 1;
				this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After TSSR: ${this.dataIndex}`); // TSSR
				const vpVal = this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After vpVal: ${this.dataIndex}`);
				if (this.success && vpVal !== undefined) {
					this.VPCount = 250 * (1 << vpVal);
				}
				this.seek(5, 1);
				logger.log(`${'  '.repeat(level)}  After seek 5: ${this.dataIndex}`);
				this.replayName = this.readLengthString();
				logger.log(`${'  '.repeat(level)}  After replayName: ${this.dataIndex}`);
				this.seek(8, 1);
				logger.log(`${'  '.repeat(level)}  After seek 8: ${this.dataIndex}`);

				const gameVersionIndicator = this.readUnsignedLong4Bytes();
				logger.log(
					`${'  '.repeat(level)}  After gameVersionIndicator (${gameVersionIndicator}): ${this.dataIndex}`
				); // Index is now positioned AFTER the indicator

				if (this.success && gameVersionIndicator === 2) {
					this.readLengthASCIIString();
					logger.log(`${'  '.repeat(level)}  After gameversion string 1: ${this.dataIndex}`); // gameversion string 1 (ignore)
					this.gameVersion = this.readLengthASCIIString();
					logger.log(`${'  '.repeat(level)}  After gameVersion string 2: ${this.dataIndex}`); // gameversion string 2 (capture)
				}

				// --- Problem Area ---
				// The index should now be correctly positioned *after* gameVersionIndicator
				logger.log(
					`${'  '.repeat(level)}  Attempting to read unknown string before matchType at index: ${this.dataIndex}`
				);
				this.readLengthASCIIString(); // Unknown string before matchType? (ignore based on python)
				logger.log(
					`${'  '.repeat(level)}  After unknown string read (Success: ${this.success}): ${this.dataIndex}`
				);

				if (this.success) {
					// Only attempt matchType if previous read succeeded
					logger.log(
						`${'  '.repeat(level)}  Attempting to read matchType at index: ${this.dataIndex}`
					);
					this.matchType = this.readLengthASCIIString(); // This should now read the correct data
					logger.log(
						`${'  '.repeat(level)}  After matchType read (Success: ${this.success}): ${this.dataIndex}`
					);

					// Handle specific Korean automatch string case from Python
					if (
						this.success && // Check success before accessing matchType
						this.matchType &&
						this.matchType.includes('\uc0de\u0bad\u0101\u4204\u4cc5\u0103\u1000')
					) {
						this.matchType = 'automatch';
					}
				}
				logger.log(
					`${'  '.repeat(level)}Finished parsing DATABASE. Success: ${this.success}, Final Index: ${this.dataIndex}`
				);
			} else if (chunkType === 'DATAINFO' && chunkVersion === 6) {
				logger.log(`${'  '.repeat(level)}>>> Found DATAINFO v${chunkVersion} <<<`);
				const userName = this.readLengthString();
				this.readUnsignedLong4Bytes(); // unknown
				this.readUnsignedLong4Bytes(); // unknown
				const faction = this.readLengthASCIIString();
				this.readUnsignedLong4Bytes(); // unknown
				this.readUnsignedLong4Bytes(); // unknown

				if (this.success) {
					// Only add if reading was successful
					logger.log(`${'  '.repeat(level)}  Adding Player: Name=${userName}, Faction=${faction}`);
					this.playerList.push({ name: userName, faction: faction });
				} else {
					logger.error(`${'  '.repeat(level)}  Failed to read player info within DATAINFO chunk.`);
				}
				logger.log(`${'  '.repeat(level)}Finished parsing DATAINFO. Success: ${this.success}`);
			} else {
				// Log unhandled DATA chunks
				logger.log(
					`${'  '.repeat(level)}Skipping unhandled chunk: Type=${chunkType}, Version=${chunkVersion}, Name=${chunkName || 'N/A'}`
				);
			}

			// Ensure we are at the end of the chunk data, even if we didn't parse it or skipped it
			if (this.success && this.dataIndex !== expectedEndOfChunk) {
				logger.warn(
					`${'  '.repeat(level)}Data index ${this.dataIndex} does not match expected end ${expectedEndOfChunk} for chunk ${chunkType} v${chunkVersion}. Seeking to expected end.`
				);
				this.seek(expectedEndOfChunk, 0);
			} else if (!this.success) {
				logger.error(
					`${'  '.repeat(level)}Parsing failed within or before chunk ${chunkType} v${chunkVersion}. Index: ${this.dataIndex}, Expected End: ${expectedEndOfChunk}`
				);
				// Attempt to recover by seeking to the expected end of the chunk
				if (this.data && expectedEndOfChunk <= this.data.length) {
					this.seek(expectedEndOfChunk, 0);
					// Keep success as false
					logger.warn(
						`${'  '.repeat(level)}Attempted recovery seek to ${expectedEndOfChunk} after error in ${chunkType}.`
					);
				}
			} else {
				// logger.log(`${'  '.repeat(level)}Successfully parsed/skipped chunk ${chunkType}. Index reached expected end: ${this.dataIndex}`); // Optional: uncomment for verbose success
			}
		} catch (err) {
			logger.error(
				`${'  '.repeat(level)}Critical error during parsing chunk ${chunkType} (v${chunkVersion}, name: ${chunkName || 'N/A'}) at offset ${chunkStartOffset}: ${err.message}`
			);
			logger.error(err.stack); // Log stack trace for critical errors
			this.success = false;
			// Attempt to recover by seeking to the expected end of the chunk
			if (this.data && expectedEndOfChunk <= this.data.length) {
				this.seek(expectedEndOfChunk, 0);
				logger.warn(
					`${'  '.repeat(level)}Attempted recovery seek to ${expectedEndOfChunk} after critical error.`
				);
			}
		}
	}

	/**
	 * Decodes the date string into a Date object.
	 * @param {string | null | undefined} timeString
	 * @returns {Date | null}
	 */
	decodeDate(timeString) {
		if (!timeString) return null;

		try {
			// NEW: DD/MM/YYYY HH:MM (common non-US format)
			const reEuroSlash = /(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2})/;
			let match = timeString.match(reEuroSlash);
			if (match) {
				// logger.info("Euro Slash Date String:", match.slice(1));
				return new Date(
					parseInt(match[3], 10), // year
					parseInt(match[2], 10) - 1, // month (0-indexed)
					parseInt(match[1], 10), // day
					parseInt(match[4], 10), // hour
					parseInt(match[5], 10) // minute
				);
			}

			// 24hr: DD.MM.YYYY HH.mm (Note: JS Date month is 0-indexed)
			const reEuro = /(\d{2})\.(\d{2})\.(\d{4})\s(\d{2})\.(\d{2})/;
			match = timeString.match(reEuro);
			if (match) {
				// logger.info("Euro Date String:", match.slice(1));
				return new Date(
					parseInt(match[3], 10), // year
					parseInt(match[2], 10) - 1, // month (0-indexed)
					parseInt(match[1], 10), // day
					parseInt(match[4], 10), // hour
					parseInt(match[5], 10) // minute
				);
			}

			// 12hr: MM/DD/YYYY hh:mm XM *numbers are not 0-padded (using . as separator based on python)
			// Regex adjusted for flexibility (1-2 digits, any non-digit separator)
			const reUS = /(\d{1,2})[^\d](\d{1,2})[^\d](\d{4})\s(\d{1,2})\.(\d{2}).*?([APap])M/;
			match = timeString.match(reUS);
			if (match) {
				// logger.info("US Date String:", match.slice(1));
				let hour = parseInt(match[4], 10);
				const meridiem = match[6].toLowerCase();
				if (meridiem === 'p' && hour !== 12) {
					// Add 12 for PM hours, except 12 PM
					hour += 12;
				} else if (meridiem === 'a' && hour === 12) {
					// Handle 12 AM (midnight)
					hour = 0;
				}
				return new Date(
					parseInt(match[3], 10), // year
					parseInt(match[1], 10) - 1, // month (0-indexed)
					parseInt(match[2], 10), // day
					hour,
					parseInt(match[5], 10) // minute
				);
			}

			// YYYY/MM/DD HH:MM (with Korean AM/PM)
			// Regex adjusted: (\d{4}).(\d{2}).(\d{2})\s([^\u0000-\u007F]+)\s(\d{1,2}).(\d{2})
			// The middle part [^\u0000-\u007F]+ matches non-ASCII, assuming Korean AM/PM symbols
			const reAsian = /(\d{4})\D(\d{2})\D(\d{2})\s([^\u0000-\u007F]+)\s(\d{1,2})\D(\d{2})/;
			match = timeString.match(reAsian);
			if (match) {
				// logger.info("Asian Date String:", match.slice(1));
				let hour = parseInt(match[5], 10);
				const meridiem = match[4]; // e.g., "오후"
				// Check if it's the Korean PM indicator
				if (meridiem === '오후' && hour !== 12) {
					hour += 12;
				} else if (meridiem === '오전' && hour === 12) {
					// Handle Korean 12 AM
					hour = 0;
				}
				return new Date(
					parseInt(match[1], 10), // year
					parseInt(match[2], 10) - 1, // month (0-indexed)
					parseInt(match[3], 10), // day
					hour,
					parseInt(match[6], 10) // minute
				);
			}

			logger.warn(`Could not parse date string format: "${timeString}"`);
			return null; // Format not recognized
		} catch (err) {
			logger.error(`Error decoding date string "${timeString}": ${err.message}`);
			return null;
		}
	}

	/**
	 * Returns a string representation of the parsed data.
	 * @returns {string}
	 */
	toString() {
		let output = 'Parsed Replay Data:\n';
		output += `Success: ${this.success}\n`;
		output += `File Path: ${this.filePath}\n`;
		output += `File Version: ${this.fileVersion}\n`;
		output += `Chunky Version: ${this.chunkyVersion}\n`;
		output += `Random Start: ${this.randomStart}\n`;
		output += `High Resources: ${this.highResources}\n`;
		output += `VP Count: ${this.VPCount}\n`;
		output += `VP Game Mode: ${this.VPGame}\n`;
		output += `Match Type: ${this.matchType}\n`;
		output += `Local Date String: ${this.localDateString}\n`;
		output += `Local Date: ${this.localDate ? this.localDate.toISOString() : 'null'}\n`;
		output += `Unknown Date Field: ${this.unknownDate}\n`;
		output += `Replay Name: ${this.replayName}\n`;
		output += `Game Version: ${this.gameVersion}\n`;
		output += `Mod Name: ${this.modName}\n`;
		output += `Map Name UCS: ${this.mapName}\n`;
		output += `Map Name Full: ${this.mapNameFull || 'N/A (Requires UCS)'}\n`;
		output += `Map Description UCS: ${this.mapDescription}\n`;
		output += `Map Description Full: ${this.mapDescriptionFull || 'N/A (Requires UCS)'}\n`;
		output += `Map File Name: ${this.mapFileName}\n`;
		output += `Map Width: ${this.mapWidth}\n`;
		output += `Map Height: ${this.mapHeight}\n`;
		output += `Player List (${this.playerList.length}):\n`;
		this.playerList.forEach((p, i) => {
			output += `  Player ${i + 1}: Name=${p.name}, Faction=${p.faction}\n`;
		});
		return output;
	}
}

// Example Usage:
const replayFilePath =
	'/home/codeit/fknoobscoh/node-test/8p_montargis region.2022-11-02.23-41-21.rec'; // Make sure this path is correct
const parser = new ReplayParser(replayFilePath);

console.log(parser);

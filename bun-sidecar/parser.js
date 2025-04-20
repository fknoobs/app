import fs from 'fs';
const logger = console; // Using console for logging as in the original JS

// Placeholder for Settings class/functionality if needed later
// import { Settings } from './classes/oppbot_settings.js'; // Assuming path
import { UCS } from './ucs'; // Import the new UCS class

class ReplayParser {
	constructor(filePath = null, settings = null) {
		// this.settings = settings || new Settings(); // Uncomment if Settings class is available
		this.settings = settings || {}; // Using placeholder object for settings

		// *** ADD A DEFAULT UCS PATH TO SETTINGS IF NEEDED ***
		// Example: Ensure a default path exists if not provided externally
		if (!this.settings.data) this.settings.data = {};
		if (!this.settings.data.cohUCSPath) {
			// Set a sensible default or expect it to be passed in
			// this.settings.data.cohUCSPath = '/path/to/your/RelicCoH.English.ucs';
			logger.warn(
				"Settings object provided to ReplayParser does not contain 'cohUCSPath'. UCS resolution might fail."
			);
		}
		// *****************************************************

		this.filePath = filePath;

		this.fileVersion = null;
		this.chunkyVersion = null;
		this.randomStart = false; // Initialize explicitly to false
		this.highResources = null;
		this.VPCount = null;
		this.matchType = null;
		this.localDateString = null;
		this.localDate = null;
		this.unknownDate = null;
		this.replayName = null;
		this.gameVersion = null;
		this.modName = null;
		this.mapName = null; // This holds the UCS string like "$12345"
		this.mapNameFull = null; // This will hold the resolved string
		this.mapDescription = null; // This holds the UCS string
		this.mapDescriptionFull = null; // This will hold the resolved string
		this.mapFileName = null;
		this.mapWidth = null;
		this.mapHeight = null;
		this.playerList = [];
		this.VPGame = null; // Added from Python version
		this.chunkyHeaderLength = null; // Added from Python version

		this.success = null;

		this.data = null; // Will hold the Buffer
		this.dataIndex = 0;

		// Instantiate UCS helper here, passing the settings
		this.ucsResolver = new UCS({ settings: this.settings });

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
		if (!this.success) return false; // Stop if first parse fails
		this.parseChunk(0); // Parse second main FOLD (usually FOLD____)
		// Allow continuing even if second parse fails, to attempt UCS resolution

		// Resolve UCS strings after parsing main chunks
		this.resolve_mapNameFull_And_mapDescription_From_UCS();

		return this.success; // Return the final success state
	}

	// Resolve UCS strings using the UCS class instance
	resolve_mapNameFull_And_mapDescription_From_UCS() {
		try {
			// Use the ucsResolver instance created in the constructor
			this.mapNameFull = this.ucsResolver.compare_UCS(this.mapName);
			this.mapDescriptionFull = this.ucsResolver.compare_UCS(this.mapDescription);
			// If compare_UCS returns the original string on failure/not found,
			// mapNameFull will be the same as mapName (e.g., "$12345")
			// You might want to check this:
			if (this.mapNameFull === this.mapName) {
				logger.warn(`Could not resolve map name UCS string: ${this.mapName}`);
			}
			if (this.mapDescriptionFull === this.mapDescription) {
				logger.warn(`Could not resolve map description UCS string: ${this.mapDescription}`);
			}
		} catch (err) {
			logger.error('Failed to resolve UCS strings: ' + err.message);
			// Decide if this should set this.success = false
			// this.success = false;
			// Set to null or keep original UCS string if resolution fails
			this.mapNameFull = this.mapNameFull || this.mapName;
			this.mapDescriptionFull = this.mapDescriptionFull || this.mapDescription;
		}
	}

	/**
	 * Recursively parses data chunks.
	 * @param {number} level - Recursion depth (for debugging/indentation).
	 */
	parseChunk(level) {
		if (!this.success) {
			return;
		}

		const chunkStartOffset = this.dataIndex;
		const chunkTypeBytes = this.readBytes(8);
		if (!this.success || chunkTypeBytes === undefined) {
			logger.error(`${'  '.repeat(level)}Failed to read chunk type at offset ${chunkStartOffset}`);
			this.success = false;
			return;
		}
		const chunkType = chunkTypeBytes.toString('ascii');
		const chunkVersion = this.readUnsignedLong4Bytes();
		if (!this.success || chunkVersion === undefined) {
			logger.error(
				`${'  '.repeat(level)}Failed to read chunk version for type ${chunkType} at offset ${this.dataIndex - 4}`
			);
			return;
		}
		const chunkLength = this.readUnsignedLong4Bytes();
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
		this.seek(8, 1);
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
				return;
			}
		}
		const chunkHeaderSize = 28 + chunkNameLength;
		const chunkDataStart = chunkStartOffset + chunkHeaderSize;
		const expectedEndOfChunk = chunkDataStart + chunkLength;

		logger.log(
			`${'  '.repeat(level)}Parsing Chunk: Type=${chunkType}, Version=${chunkVersion}, DataLength=${chunkLength}, NameLength=${chunkNameLength}, Name=${chunkName || 'N/A'}, HeaderStart=${chunkStartOffset}, DataStart=${chunkDataStart}, ExpectedEnd=${expectedEndOfChunk}, CurrentIndex=${this.dataIndex}`
		);
		if (this.dataIndex !== chunkDataStart) {
			logger.warn(
				`${'  '.repeat(level)} >> Current index ${this.dataIndex} does not match calculated data start ${chunkDataStart}!`
			);
		}

		try {
			if (chunkType.startsWith('FOLD')) {
				logger.log(
					`${'  '.repeat(level)}Entering FOLD chunk. Current index: ${this.dataIndex}, Expected end: ${expectedEndOfChunk}`
				);
				while (this.dataIndex < expectedEndOfChunk && this.success) {
					const currentPosBeforeSubChunk = this.dataIndex;
					this.parseChunk(level + 1);
					if (!this.success || this.dataIndex === currentPosBeforeSubChunk) {
						logger.error(
							`${'  '.repeat(level)}Sub-chunk parsing failed or did not advance index. Breaking FOLD loop. Index: ${this.dataIndex}`
						);
						if (this.success && this.dataIndex === currentPosBeforeSubChunk) {
							this.success = false;
						}
						break;
					}
				}
				if (this.dataIndex !== expectedEndOfChunk && this.success) {
					logger.warn(
						`${'  '.repeat(level)}FOLD chunk ${chunkType} parsing finished at ${this.dataIndex}, but expected end was ${expectedEndOfChunk}. Seeking to expected end.`
					);
					this.seek(expectedEndOfChunk, 0);
				} else if (!this.success) {
					logger.error(
						`${'  '.repeat(level)}FOLD chunk ${chunkType} parsing failed. Index: ${this.dataIndex}, Expected end: ${expectedEndOfChunk}`
					);
					if (this.data && expectedEndOfChunk <= this.data.length) {
						this.seek(expectedEndOfChunk, 0);
						logger.warn(
							`${'  '.repeat(level)}Attempted recovery seek to ${expectedEndOfChunk} after FOLD error.`
						);
					}
				} else {
					logger.log(
						`${'  '.repeat(level)}Successfully parsed FOLD chunk ${chunkType}. Index reached expected end: ${this.dataIndex}`
					);
				}
			} else if (chunkType === 'DATASDSC' && chunkVersion === 2004) {
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
				this.seek(16, 1);
				logger.log(`${'  '.repeat(level)}  After seek 16: ${this.dataIndex}`);
				const randomStartVal = this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After randomStartVal: ${this.dataIndex}`);
				if (this.success) this.randomStart = randomStartVal !== undefined && randomStartVal !== 0;
				this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After COLS: ${this.dataIndex}`);
				const highResVal = this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After highResVal: ${this.dataIndex}`);
				if (this.success) this.highResources = highResVal === 1;
				this.readUnsignedLong4Bytes();
				logger.log(`${'  '.repeat(level)}  After TSSR: ${this.dataIndex}`);
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

				const vpGameIndicator = this.readUnsignedLong4Bytes();
				if (this.success) this.VPGame = vpGameIndicator === 0x603872a3;
				logger.log(
					`${'  '.repeat(level)}  After vpGameIndicator (${vpGameIndicator}): ${this.dataIndex}`
				);

				this.seek(23, 1);
				logger.log(`${'  '.repeat(level)}  After seek 23: ${this.dataIndex}`);

				const gameMinorVersion = this.readLengthASCIIString();
				logger.log(
					`${'  '.repeat(level)}  After gameMinorVersion (${gameMinorVersion?.length}): ${this.dataIndex}`
				);

				this.seek(4, 1);
				logger.log(`${'  '.repeat(level)}  After seek 4: ${this.dataIndex}`);

				const gameMajorVersion = this.readLengthASCIIString();
				logger.log(
					`${'  '.repeat(level)}  After gameMajorVersion (${gameMajorVersion?.length}): ${this.dataIndex}`
				);

				this.seek(8, 1);
				logger.log(`${'  '.repeat(level)}  After seek 8: ${this.dataIndex}`);

				const matchNameIndicator = this.readUnsignedLong4Bytes();
				logger.log(
					`${'  '.repeat(level)}  After matchNameIndicator (${matchNameIndicator}): ${this.dataIndex}`
				);

				if (this.success && matchNameIndicator === 2) {
					this.readLengthASCIIString();
					logger.log(
						`${'  '.repeat(level)}  After gameversion string 1 (ignored): ${this.dataIndex}`
					);
					this.gameVersion = this.readLengthASCIIString();
					logger.log(
						`${'  '.repeat(level)}  After gameVersion string 2 (captured): ${this.dataIndex}`
					);
				}

				const unknownStringBeforeMatchType = this.readLengthASCIIString();
				logger.log(
					`${'  '.repeat(level)}  After unknown string before matchType (${unknownStringBeforeMatchType?.length}): ${this.dataIndex}`
				);

				if (this.success) {
					logger.log(
						`${'  '.repeat(level)}  Attempting to read matchType at index: ${this.dataIndex}`
					);
					this.matchType = this.readLengthASCIIString();
					logger.log(
						`${'  '.repeat(level)}  After matchType read (Success: ${this.success}): ${this.dataIndex}`
					);

					if (
						this.success &&
						this.matchType &&
						this.matchType.includes('\uc0de\u0bad\u0101\u4204\u4cc5\u0103\u1000')
					) {
						logger.log(
							`${'  '.repeat(level)}  Detected Korean automatch string, setting matchType to 'automatch'.`
						);
						this.matchType = 'automatch';
					}
				}
				logger.log(
					`${'  '.repeat(level)}Finished parsing DATABASE. Success: ${this.success}, Final Index: ${this.dataIndex}`
				);
			} else if (chunkType === 'DATAINFO' && chunkVersion === 6) {
				logger.log(`${'  '.repeat(level)}>>> Found DATAINFO v${chunkVersion} <<<`);
				const userName = this.readLengthString();
				this.readUnsignedLong4Bytes();
				this.readUnsignedLong4Bytes();
				const faction = this.readLengthASCIIString();
				this.readUnsignedLong4Bytes();
				this.readUnsignedLong4Bytes();

				if (this.success) {
					logger.log(`${'  '.repeat(level)}  Adding Player: Name=${userName}, Faction=${faction}`);
					this.playerList.push({ name: userName, faction: faction });
				} else {
					logger.error(`${'  '.repeat(level)}  Failed to read player info within DATAINFO chunk.`);
				}
				logger.log(`${'  '.repeat(level)}Finished parsing DATAINFO. Success: ${this.success}`);
			} else {
				logger.log(
					`${'  '.repeat(level)}Skipping unhandled chunk: Type=${chunkType}, Version=${chunkVersion}, Name=${chunkName || 'N/A'}`
				);
			}

			if (this.success && this.dataIndex !== expectedEndOfChunk) {
				logger.warn(
					`${'  '.repeat(level)}Data index ${this.dataIndex} does not match expected end ${expectedEndOfChunk} for chunk ${chunkType} v${chunkVersion}. Seeking to expected end.`
				);
				this.seek(expectedEndOfChunk, 0);
			} else if (!this.success) {
				logger.error(
					`${'  '.repeat(level)}Parsing failed within or before chunk ${chunkType} v${chunkVersion}. Index: ${this.dataIndex}, Expected End: ${expectedEndOfChunk}`
				);
				if (this.data && expectedEndOfChunk <= this.data.length) {
					this.seek(expectedEndOfChunk, 0);
					logger.warn(
						`${'  '.repeat(level)}Attempted recovery seek to ${expectedEndOfChunk} after error in ${chunkType}.`
					);
				}
			}
		} catch (err) {
			logger.error(
				`${'  '.repeat(level)}Critical error during parsing chunk ${chunkType} (v${chunkVersion}, name: ${chunkName || 'N/A'}) at offset ${chunkStartOffset}: ${err.message}`
			);
			logger.error(err.stack);
			this.success = false;
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
			const reEuroSlash = /(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2})/;
			let match = timeString.match(reEuroSlash);
			if (match) {
				return new Date(
					parseInt(match[3], 10),
					parseInt(match[2], 10) - 1,
					parseInt(match[1], 10),
					parseInt(match[4], 10),
					parseInt(match[5], 10)
				);
			}

			const reEuro = /(\d{2})\.(\d{2})\.(\d{4})\s(\d{2})\.(\d{2})/;
			match = timeString.match(reEuro);
			if (match) {
				return new Date(
					parseInt(match[3], 10),
					parseInt(match[2], 10) - 1,
					parseInt(match[1], 10),
					parseInt(match[4], 10),
					parseInt(match[5], 10)
				);
			}

			const reUS = /(\d{1,2})[^\d](\d{1,2})[^\d](\d{4})\s(\d{1,2})\.(\d{2}).*?([APap])M/;
			match = timeString.match(reUS);
			if (match) {
				let hour = parseInt(match[4], 10);
				const meridiem = match[6].toLowerCase();
				if (meridiem === 'p' && hour !== 12) {
					hour += 12;
				} else if (meridiem === 'a' && hour === 12) {
					hour = 0;
				}
				return new Date(
					parseInt(match[3], 10),
					parseInt(match[1], 10) - 1,
					parseInt(match[2], 10),
					hour,
					parseInt(match[5], 10)
				);
			}

			const reAsian = /(\d{4})\D(\d{2})\D(\d{2})\s([^\u0000-\u007F]+)\s(\d{1,2})\D(\d{2})/;
			match = timeString.match(reAsian);
			if (match) {
				let hour = parseInt(match[5], 10);
				const meridiem = match[4];
				if (meridiem === '오후' && hour !== 12) {
					hour += 12;
				} else if (meridiem === '오전' && hour === 12) {
					hour = 0;
				}
				return new Date(
					parseInt(match[1], 10),
					parseInt(match[2], 10) - 1,
					parseInt(match[3], 10),
					hour,
					parseInt(match[6], 10)
				);
			}

			logger.warn(`Could not parse date string format: "${timeString}"`);
			return null;
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
		output += `Map Name Full: ${this.mapNameFull || 'N/A (Resolution failed or pending)'}\n`;
		output += `Map Description UCS: ${this.mapDescription}\n`;
		output += `Map Description Full: ${this.mapDescriptionFull || 'N/A (Resolution failed or pending)'}\n`;
		output += `Map File Name: ${this.mapFileName}\n`;
		output += `Map Width: ${this.mapWidth}\n`;
		output += `Map Height: ${this.mapHeight}\n`;
		output += `Player List (${this.playerList.length}):\n`;
		this.playerList.forEach((p, i) => {
			output += `  Player ${i + 1}: Name=${p.name}, Faction=${p.faction}\n`;
		});
		return output;
	}

	toJSON() {
		return {
			success: this.success,
			filePath: this.filePath,
			fileVersion: this.fileVersion,
			chunkyVersion: this.chunkyVersion,
			randomStart: this.randomStart,
			highResources: this.highResources,
			VPCount: this.VPCount,
			VPGameMode: this.VPGame,
			matchType: this.matchType,
			localDateString: this.localDateString,
			localDate: this.localDate ? this.localDate.toISOString() : null,
			unknownDateField: this.unknownDate,
			replayName: this.replayName,
			gameVersion: this.gameVersion,
			modName: this.modName,
			mapNameUCS: this.mapName,
			mapNameFull: this.mapNameFull || null,
			mapDescriptionUCS: this.mapDescription,
			mapDescriptionFull: this.mapDescriptionFull || null,
			mapFileName: this.mapFileName,
			mapWidth: this.mapWidth,
			mapHeight: this.mapHeight,
			playerList: this.playerList
		};
	}
}

// Example Usage:
const replayFilePath =
	'/home/codeit/fknoobscoh/node-test/6p_red_ball_express.2022-08-16.22-03-51.rec';

const settings = {
	data: {
		cohUCSPath: '/home/codeit/fknoobscoh/node-test/RelicCOH.English.ucs'
	}
};

const parser = new ReplayParser(replayFilePath, settings);

console.log(parser.toJSON());

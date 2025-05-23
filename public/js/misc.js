// Base92 Encoder/Decoder
const BASE92_CHARS = (() => {
	const chars = [];
	for (let i = 33; i <= 126; i++) {
		if (i !== 34 && i !== 92) chars.push(String.fromCharCode(i)); // Exclude " and \
	}
	return chars;
})();

const BASE92_CHAR_TO_VALUE = Object.fromEntries(BASE92_CHARS.map((c, i) => [c, i]));

function encodeBase92(data) {
	let bits = "";
	for (let byte of data) {
		bits += byte.toString(2).padStart(8, "0");
	}

	let result = "";
	while (bits.length >= 13) {
		const chunk = bits.slice(0, 13);
		bits = bits.slice(13);
		const val = parseInt(chunk, 2);
		const a = Math.floor(val / 91);
		const b = val % 91;
		result += BASE92_CHARS[a] + BASE92_CHARS[b];
	}

	if (bits.length > 0) {
		const val = parseInt(bits.padEnd(13, "0"), 2);
		const a = Math.floor(val / 91);
		const b = val % 91;
		result += BASE92_CHARS[a] + BASE92_CHARS[b];
	}

	return result;
}

function decodeBase92(str) {
	let bits = "";
	for (let i = 0; i < str.length; i += 2) {
		const a = BASE92_CHAR_TO_VALUE[str[i]];
		const b = BASE92_CHAR_TO_VALUE[str[i + 1]];
		const val = a * 91 + b;
		bits += val.toString(2).padStart(13, "0");
	}

	const bytes = [];
	for (let i = 0; i + 8 <= bits.length; i += 8) {
		bytes.push(parseInt(bits.slice(i, i + 8), 2));
	}

	return new Uint8Array(bytes);
}

// Async Delay
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// SweetAlert Toaster
const Toast = Swal.mixin({
	toast: true,
	position: "top-end",
	showConfirmButton: false,
	timerProgressBar: true,
	timer: 3000,
	customClass: {
		title: "text-sm",
	},
});
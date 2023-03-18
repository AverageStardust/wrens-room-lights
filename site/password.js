export function getUserPassword() {
	let password = getCookie("wrensRoomLightsPassword");

	while (password === null || password.length < 1) {
		password = prompt("What is the password?");
		setCookie("wrensRoomLightsPassword", password);
	}
}

function setCookie(name, value) {
	document.cookie = `${name}=${btoa(value)}`; 
}

function getCookie(name) {
	const cookie = document.cookie
		.split("; ")
		.find((row) => row.startsWith(name + "="));
	if (cookie === undefined) return null;
	return atob(cookie.split("=").splice(1).join(""));
}
// this is not secure

const usernameStorageKey = "WrensRoomLightsUsername";
const passName = "chaos";

export async function securityCheck() {
	let name = localStorage.getItem(usernameStorageKey);
	if (name === null) {
		name = prompt("What is your name, stranger? (cowboy accent)");
		while (name === null || name.length < 2) {
			name = prompt("I'm a bit mad now, what is your name?");
		}
	}
	localStorage.setItem(usernameStorageKey, name);
	if (name === passName) return true;

	alert(`You shouldn't be here "${name}".`);
	window.location.replace("https://youtu.be/dQw4w9WgXcQ");

	return false;
}
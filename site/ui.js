import { update as updateEffects } from "./effect.js";

let mainElm, effectGridElm, computedStyle;

export async function init() {
	mainElm = document.getElementsByTagName("main")[0];
	effectGridElm = document.getElementById("effectGrid");
	computedStyle = getComputedStyle(document.documentElement);

	const configsResponse = await fetch("effects.json");
	const configs = await configsResponse.json();

	updateEffects(configs);

	createDraggableGrid(effectGridElm, "roomLightingEffectOrder");
}

export function getMainElm() {
	return mainElm;
}

export function getEffectGridElm() {
	return effectGridElm;
}

function createDraggableGrid(gridElm, localStorageKey) {
	let dragElm, swappedDurringDrag = new Set();

	const observer = new MutationObserver(_exportOrder);

	const config = {
		childList: true
	};

	observer.observe(gridElm, config);

	gridElm.addEventListener("dragstart", function (e) {
		dragElm = e.target;

		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("Text", dragElm.textContent);

		gridElm.addEventListener("dragover", _onDragOver, false);
		gridElm.addEventListener("dragend", _onDragEnd, false);

		setTimeout(function () {
			dragElm.classList.add("ghost");
		}, 0);
	});

	_importOrder();

	function _exportOrder() {
		const order = [...gridElm.children].map((elm) => elm.id);
		localStorage.setItem(localStorageKey, JSON.stringify(order));
	}

	function _importOrder() {
		const orderStr = localStorage.getItem(localStorageKey);
		if (orderStr === null) return;
		const order = JSON.parse(orderStr);

		[...gridElm.children]
			.sort((a, b) => {
				let indexA = order.indexOf(a.id);
				if (indexA === -1) indexA = Infinity;
				let indexB = order.indexOf(b.id);
				if (indexB === -1) indexB = Infinity;
				return indexA > indexB ? 1 : -1;
			}).forEach(node => gridElm.appendChild(node));
	}

	function _onDragOver(e) {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";

		let target = e.target;
		if (!target) return;

		while (!target.classList.contains("effectContainer")) {
			if (!target.parentElement) return;
			target = target.parentElement;
		}

		if (swappedDurringDrag.has(target)) return;
		swappedDurringDrag.add(target);

		e.stopPropagation();
		if (_index(dragElm) < _index(target)) {
			gridElm.insertBefore(dragElm, target.nextSibling);
		} else {
			gridElm.insertBefore(dragElm, target);
		}
	}

	function _index(elm) {
		if (!elm) return -1;
		var i = 0;
		do {
			i++;
		} while (elm = elm.previousElementSibling);
		return i;
	}

	function _onDragEnd(e) {
		e.preventDefault();

		dragElm.classList.remove("ghost");

		gridElm.removeEventListener("dragover", _onDragOver, false);
		gridElm.removeEventListener("dragend", _onDragEnd, false);

		swappedDurringDrag.clear();
	}
}

export function getCSS(varName) {
	return computedStyle.getPropertyValue(varName);
}
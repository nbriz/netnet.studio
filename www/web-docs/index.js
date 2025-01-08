// setup and size calculations
function sizeCalcs() {
	// define side navigation panel
	// get its width

	var panel = document.querySelector('.docs__panel');
	var panelWidth = panel.offsetWidth;

	// determine viewers width

	var viewer = document.querySelector('.docs__viewer');
	viewer.style.width = "calc(100vw - " + panelWidth + "px - (var(--doc-padding) * 3))";
}

// load function
function load() {
	sizeCalcs();
}


// event listeners
window.addEventListener("resize", function(e) {
	sizeCalcs();
});

window.addEventListener('load', load)
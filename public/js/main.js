// window.addEventListener('click', e => {
// 	const target = e.target;
// 	console.log(target);

// 	target.style.outline = "1px solid red";
// })

document.addEventListener("DOMContentLoaded", () => {
	
	// Chat handler	
	const chat = new Chat();


	// Show & Hide Drawer Handler

	const drawer = document.getElementById("drawer");
	const showDrawerBtn = document.getElementById("show-drawer");
	const hideDrawerBtn = document.getElementById("hide-drawer");

	showDrawerBtn.addEventListener("click", function () {
		drawer.classList.add("active");
		showDrawerBtn.classList.add("hide");
	});

	hideDrawerBtn.addEventListener("click", function () {
		drawer.classList.remove("active");
		setTimeout(() => {
			showDrawerBtn.classList.remove("hide");
		}, 100);
	});

	if (window.innerWidth > 768) {
		drawer.classList.add("active");
		showDrawerBtn.classList.add("hide");
	}

	// Set UI Theme

	document.documentElement.dataset.theme = localStorage.getItem("chat-theme") || "dark";

	const themeToggle = (theme) => {
		// console.log(`#theme-list li button[data-set-theme="${theme}"]`);
		document.querySelectorAll("#theme-list li > button").forEach((button) => {
			button.classList.remove("menu-active");
		});
		document.querySelector(`#theme-list li > button[data-set-theme="${theme}"]`).classList.add("menu-active");
	};

	document.querySelectorAll(".set-theme").forEach((btn) => {
		btn.addEventListener("click", function () {
			const theme = btn.dataset.setTheme;

			document.documentElement.dataset.theme = theme;
			localStorage.setItem("chat-theme", theme);

			themeToggle(theme);
		});
	});

	themeToggle(document.documentElement.dataset.theme);


	// Profile Handler

	const profileModal = document.getElementById("profileModal");
	const usernameDisplay = document.querySelector("#username-display");
	const changeProfile = document.querySelector("#change-profile");

	const profileModalSubmitHandler = async () => {
		const usernameInput = profileModal.querySelector("#username");
		usernameInput.classList.remove("form-error");

		if (!usernameInput.value) {
			usernameInput.setAttribute("placeholder", "Please fill this field!");
			setTimeout(() => {
				usernameInput.classList.add("form-error");
			}, 10);
		} else {
			let username = usernameInput.value;

			if (profile === null) {
				let res = await fetch("/uuid");
				let userId = await res.text();

				profile = { username, userId };
			} else {
				profile.username = username;
			}

			chat.changeProfile(profile);
			localStorage.setItem("profile", JSON.stringify(profile));
			usernameDisplay.textContent = profile.username;

			profileModal.close();
			Toast.fire({
				icon: "success",
				title: "New profile updated!",
			});
		}
	};

	let profile = localStorage.getItem("profile");

	if (!profile) {
		profileModal.showModal();
		profileModal.querySelector(".divider").textContent = "Welcome👋";

		profileModal.querySelector("button.submit").onclick = profileModalSubmitHandler;
		document.onkeydown = (e) => {
			if (e.key === "Enter") profileModalSubmitHandler();
		};
	} else {
		profile = JSON.parse(profile);
		usernameDisplay.textContent = profile.username;
	}

	changeProfile.addEventListener("click", () => {
		profileModal.showModal();
		profileModal.querySelector(".divider").textContent = "Profile";

		profileModal.querySelector("button.submit").onclick = profileModalSubmitHandler;
		document.onkeydown = (e) => {
			if (e.key === "Enter") profileModalSubmitHandler();
		};

		setTimeout(() => {
			document.querySelector("#username").value = profile.username;
		}, 10);

		if (!profileModal.querySelector(`form[method="dialog"]`)) profileModal.innerHTML += `<form method="dialog" class="modal-backdrop"><button></button></form>`;
	});


	// List Channel Handler

	let listChannel = localStorage.getItem("list-channel")
		? JSON.parse(localStorage.getItem("list-channel"))
		: [
				{
					code: "1.1.1.1",
					label: "Channel 1",
				},
		  ];

	const channelList = document.querySelector("#channel-list");

	const templates = document.querySelectorAll("#channel-list > li");
	const inactiveListTemplate = templates[0].innerHTML;
	const activeListTemplate = templates[1].innerHTML;

	let renderListChannel = () => {
		channelList.innerHTML = "";

		for (let ch of listChannel) {
			let li = document.createElement("li");

			if (chat.roomId == ch['code']) {
				li.innerHTML = activeListTemplate.replaceAll("{{label}}", ch["label"]).replaceAll("{{code}}", ch["code"]);
				li.className = "active";
				channelList.prepend(li);
			} else {
				li.innerHTML = inactiveListTemplate.replaceAll("{{label}}", ch["label"]).replaceAll("{{code}}", ch["code"]);
				channelList.append(li);
			}

		}

		refreshChannelListEvent();
	};

	let refreshChannelListEvent = () => {

		// Delete Event
		channelList.querySelectorAll("button.delete-item").forEach((btn) => {
			btn.onclick = function(event) {
				event.stopPropagation();
				
				const code = btn.closest(".item").dataset.code;

				Swal.fire({
					title: "Caution!",
					text: "Are tou sure want to delete this item?",
					icon: "question",
					showCancelButton: true,
					confirmButtonColor: "var(--color-primary)",
					cancelButtonColor: "var(--color-secondary)",
					confirmButtonText: "Confirm",
				}).then((result) => {
					if (result.isConfirmed) {
						let index = listChannel.map((item) => item.code).indexOf(code);
		
						if (index !== -1) {
							listChannel.splice(index, 1);
							localStorage.setItem("list-channel", JSON.stringify(listChannel));
		
							Toast.fire({
								icon: "success",
								title: "Item deleted successfully!",
							});

							renderListChannel();
						} else {
							Toast.fire({
								icon: "error",
								title: "That channel's code isn't in list!",
							});
						}
					}
				});

			};
		});

		// Disconnect Button Event
		channelList.querySelectorAll('li.active button.disconnect-btn').forEach((btn) => {
			btn.onclick = function(event) {
				event.stopPropagation();

				Swal.fire({
					title: "Caution!",
					html: "Disconnect to this channel? <br>(You will lose all current chat history)",
					icon: "warning",
					showCancelButton: true,
					confirmButtonColor: "var(--color-primary)",
					cancelButtonColor: "var(--color-secondary)",
					confirmButtonText: "Confirm",
				}).then((result) => {
					if (result.isConfirmed && chat.roomId !== null) {
						chat.leaveRoom();
						renderListChannel();
					}
				});

			}
		});

		// Connect Event
		channelList.querySelectorAll('li:not(.active)').forEach((li) => {
			li.onclick = function() {
				const code = li.children[0].dataset.code;

				chat.joinRoom(code);
				renderListChannel();
			};
		});

	};

	renderListChannel();

	const channelModal = document.querySelector("#channelModal");
	const addChannel = document.getElementById("add-channel");
	const codeInputs = Array.from(document.querySelectorAll("#code input"));

	codeInputs.forEach((input) => {
		input.addEventListener("input", (e) => {
			const input = e.target;
			const currentIndex = codeInputs.indexOf(input);

			if (input.value.length === 1) {
				if (currentIndex < codeInputs.length - 1) {
					codeInputs[currentIndex + 1].focus();
				}
			}
		});

		input.addEventListener("keydown", (e) => {
			const input = e.target;
			const currentIndex = codeInputs.indexOf(input);

			if (e.key === "Backspace" && currentIndex > 0) {
				e.preventDefault();
				input.value = "";
				codeInputs[currentIndex - 1].focus();
			}
		});
	});

	const channelModalSubmitHandler = () => {
		let validated = true;
		const warningTexts = Array.from(document.querySelectorAll("#channelModal .label"));

		warningTexts.forEach((t) => {
			t.classList.remove("text-error");
		});

		const label = document.querySelector("#name").value;
		if (!label) {
			validated = false;
			setTimeout(() => {
				warningTexts[0].classList.add("text-error");
			}, 10);
		}

		if (!codeInputs.map((d) => !!d.value).every(Boolean)) {
			validated = false;
			setTimeout(() => {
				warningTexts[1].classList.add("text-error");
				warningTexts[1].textContent = "Code is required!";
			}, 10);
		}

		if (validated) {
			const code = codeInputs.map((d) => d.value).join(".");
			let check = listChannel.filter((item) => item.code === code);

			if (check.length !== 0) {
				setTimeout(() => {
					warningTexts[1].classList.add("text-error");
					warningTexts[1].textContent = "This channel code is already in list!";
				}, 10);
			} else {
				listChannel.push({ code, label });
				localStorage.setItem("list-channel", JSON.stringify(listChannel));

				renderListChannel();

				channelModal.close();
				Toast.fire({
					icon: "success",
					title: "New channel added!",
				});
			}
		}
	};

	addChannel.addEventListener("click", () => {
		channelModal.showModal();

		channelModal.querySelector("button.submit").onclick = channelModalSubmitHandler;
		document.onkeydown = (e) => {
			if (e.key === "Enter") channelModalSubmitHandler();
		};
	});

});

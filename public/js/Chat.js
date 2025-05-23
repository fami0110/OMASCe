class Chat {
	constructor() {
		this.parent = document.getElementById("chat");
		this.profile = JSON.parse(localStorage.getItem("profile")) || null;
		this.roomId = null;
		this.socket = io();
		this.templates = {};
        this.audios = {};
		this.actionStanby = true;

		this.init = this.init.bind(this);
		this.changeProfile = this.changeProfile.bind(this);
		this.playSound = this.playSound.bind(this);
		this.parseTemplate = this.parseTemplate.bind(this);
		this.formatContent = this.formatContent.bind(this);
		this.pushBubble = this.pushBubble.bind(this);
		this.open = this.open.bind(this);
		this.close = this.close.bind(this);
		this.joinRoom = this.joinRoom.bind(this);
		this.leaveRoom = this.leaveRoom.bind(this);
		this.sendMessage = this.sendMessage.bind(this);
		this.sendVoice = this.sendVoice.bind(this);
		this.renderWave = this.renderWave.bind(this);
		this.liveNew = this.liveNew.bind(this);
		this.liveUpdate = this.liveUpdate.bind(this);
		this.liveEnd = this.liveEnd.bind(this);

		this.init();
	}

	init() {
		// Add templates
		const listname = ["notification", "chat-left", "chat-right", "audio-left", "audio-right", "live-left", "live-right"];
        const templates = this.parent.children;
		listname.forEach((name, i) => {
			this.templates[name] = templates[i].outerHTML;
		});

		this.parent.innerHTML = "";

        // Add sfx
        const listSfx = ['notif-sfx', 'send-sfx', 'connect-sfx', 'disconnect-sfx'];
        listSfx.forEach((id) => {
            this.audios[id] = document.getElementById(id);
        });
        

		// Socket Event Handlers
        this.socket.on("disconnect", () => {
            if (this.roomId !== null) {
                this.playSound('disconnect-sfx');

                const onlineIndicator = document.querySelectorAll("#profile .indicator-item");
                onlineIndicator.forEach((i) => {
			        i.classList.add("hide");
		        });

                let bubble = this.parseTemplate("notification", {
                    content: "Disconnected",
                });

                this.pushBubble(bubble);
    
                Toast.fire({
                    icon: "warning",
                    title: "Disconnected from server!",
                });
            }
        });

        this.socket.on("connect", () => {
            if (this.roomId !== null) {
                this.playSound('connect-sfx');

                this.joinRoom(this.roomId, false);

                const onlineIndicator = document.querySelectorAll("#profile .indicator-item");
                onlineIndicator.forEach((i) => {
			        i.classList.remove("hide");
		        });
                
                Toast.fire({
                    icon: "success",
                    title: "Connected to the server!",
                });
            }
        });

		this.socket.on("userConnected", ({ username }) => {
			const joinMessages = [
				"✅ | {username} has landed",
				"✅ | {username} has arrived",
				"✅ | {username} just dropped in",
				"✅ | {username} joined the party",
				"✅ | {username} is here. Let the fun begin!",
				"✅ | Welcome, {username}!",
				"✅ | {username} popped in",
				"✅ | {username} just entered the room",
				"✅ | Brace yourselves, {username} is here",
				"✅ | {username} just teleported in",
				"✅ | {username} slid into the room",
				"✅ | {username} showed up out of nowhere",
				"✅ | Hey! {username} joined us",
				"✅ | {username} is now online",
				"✅ | {username} has entered the chat",
				"✅ | Sound the alarms, {username} is here!",
				"✅ | {username} spawned",
				"✅ | {username} has connected",
				"✅ | Boom! {username} has arrived",
				"✅ | The legend {username} just joined",
			];

            const message = joinMessages[Math.floor(Math.random() * joinMessages.length)].replace("{username}", `<b>${username}</b>`);            

			let bubble = this.parseTemplate("notification", {
				content: message,
			});

			this.pushBubble(bubble);
		});

		this.socket.on("userDisconnected", ({ username }) => {
			const leaveMessages = [
				"❌ | {username} has left the building",
				"❌ | {username} disappeared into the void",
				"❌ | {username} rage quit",
				"❌ | {username} logged out",
				"❌ | {username} vanished without a trace",
				"❌ | {username} has gone offline",
				"❌ | {username} yeeted out of here",
				"❌ | {username} dipped",
				"❌ | {username} exited the room",
				"❌ | Poof! {username} is gone",
				"❌ | {username} has left the chat",
				"❌ | {username} disconnected",
				"❌ | {username} is no longer with us",
				"❌ | {username} went AFK... forever?",
				"❌ | {username} has quit the party",
				"❌ | The winds took {username} away",
				"❌ | {username} just ghosted",
				"❌ | A wild {username} has fled",
				"❌ | {username} is outta here",
				"❌ | {username} went to sleep",
			];

            const message = leaveMessages[Math.floor(Math.random() * leaveMessages.length)].replace("{username}", `<b>${username}</b>`);

            let bubble = this.parseTemplate("notification", {
				content: message,
			});

			this.pushBubble(bubble);
		});

        this.socket.on("chat", ({ messageId, subject, content, time }) => {
            this.playSound('notif-sfx');

			const date = new Date(time);
			const hours = date.getHours().toString().padStart(2, "0");
			const minutes = date.getMinutes().toString().padStart(2, "0");

			let bubble = this.parseTemplate("chat-left", {
				id: messageId,
				subject,
				content: this.formatContent(content),
				time: `${hours}:${minutes}`,
			});

			this.pushBubble(bubble);
		});

        this.socket.on("voice", ({ messageId, subject, content, time }) => {
            this.playSound('notif-sfx');

			const date = new Date(time);
			const hours = date.getHours().toString().padStart(2, "0");
			const minutes = date.getMinutes().toString().padStart(2, "0");

			let bubble = this.parseTemplate("audio-left", {
				id: messageId,
				subject,
				time: `${hours}:${minutes}`,
			});

			this.pushBubble(bubble);

			const blob = new Blob([decodeBase92(content)], { type: "audio/webm" });
			const src = URL.createObjectURL(blob);

			this.renderWave(messageId, src);
		});

		this.socket.on("liveNew", ({ messageId, subject, time }) => {
			this.playSound('notif-sfx');

			const date = new Date(time);
			const hours = date.getHours().toString().padStart(2, "0");
			const minutes = date.getMinutes().toString().padStart(2, "0");

			let bubble = this.parseTemplate("live-left", {
				id: messageId,
				subject,
				time: `${hours}:${minutes}`,
			});

			this.pushBubble(bubble);
		});

		this.socket.on("liveUpdate", ({ messageId, content }) => {
			const bubble = document.getElementById(messageId);
			const p = bubble.querySelector('p');

			p.textContent = this.formatContent(content);
		});

		this.socket.on("liveEnd", ({ messageId }) => {
			const bubble = document.getElementById(messageId);
			const header = bubble.querySelector('.text-xs');

			header.innerHTML = "Live Message Ended";
			header.classList.remove('text-red-400');
		});

		// Switch Action Mode
		const switchMenus = document.querySelectorAll('#switch-actions > li > div');
		const dropdownMenuBtn = document.querySelector('#message-types > div[role="button"]')

		switchMenus.forEach((menu) => {
			menu.addEventListener('click', () => {
				if (this.actionStanby && !menu.classList.contains('menu-active')) {
					const previousActiveMenu = document.querySelector('#switch-actions > li > div.menu-active');
					previousActiveMenu.classList.remove('menu-active');
					document.getElementById(previousActiveMenu.dataset.target).classList.add('hide');
					
					menu.classList.add('menu-active');
					document.getElementById(menu.dataset.target).classList.remove('hide');
				}
			})
		})

        
		// Action: Text
		const actionText = document.querySelector('#action-text');
        let inputMessage = actionText.querySelector('textarea');
        let sendBtn = actionText.querySelector('button');

        let sendMessageHandler = () => {
            if (this.roomId !== null) {
                const content = inputMessage.value.trim();

                if (content !== '') {
                    this.sendMessage(content);
                    inputMessage.value = "";
                }
            }
        }

        inputMessage.addEventListener('keypress', (e) => {
            if (e.key === "Enter") {
                if (e.shiftKey) return 0;

                e.preventDefault();
                sendMessageHandler();
            }
        });

        sendBtn.addEventListener('click', sendMessageHandler);


		// Action: Voice
		const actionVoice = document.querySelector('#action-voice');
		let indicatortext = actionVoice.querySelector('label p');
		let timerBadge = actionVoice.querySelector('label span.badge');

		let recordBtn = actionVoice.querySelector('button');
		let voiceRecord = recordBtn.querySelector('svg.icon-record');
		let voiceStop = recordBtn.querySelector('svg.icon-stop');

		let mediaRecorder = null;
		let audioChunks = [];

		let interval = null;
		let time = 0;

		recordBtn.addEventListener('click', async () => {
			if (this.roomId !== null) {
				if (this.actionStanby) {

					try {
						const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
						mediaRecorder = new MediaRecorder(stream);
						audioChunks = [];

						mediaRecorder.ondataavailable = e => {
							if (e.data.size > 0) audioChunks.push(e.data);
						};

						mediaRecorder.onstop = async () => {
							this.sendVoice((new Blob(audioChunks, { type: 'audio/webm' })));
						};

						mediaRecorder.start();

						timerBadge.textContent = "00:00";
						interval = setInterval(() => {
							time++;

							const minutes = Math.floor(time / 60);
							const seconds = Math.floor(time % 60).toString().padStart(2, '0');
							
							timerBadge.textContent = `${minutes}:${seconds}`;
						}, 1000);

						voiceRecord.classList.add('hide');
						voiceStop.classList.remove('hide');
						indicatortext.textContent = "Recording...";
						timerBadge.classList.remove('hide');

						dropdownMenuBtn.style.pointerEvents = "none";
						this.actionStanby = false;

					} catch (e) {
						console.error('Error while recording: ' + e);
					}
				
				} else {
					mediaRecorder.stop();
					
					voiceRecord.classList.remove('hide');
					voiceStop.classList.add('hide');
					indicatortext.textContent = "Press the button to start recording";
					timerBadge.classList.add('hide');
					
					clearInterval(interval);
					
					dropdownMenuBtn.style.pointerEvents = "auto"
					this.actionStanby = true;
				}
			}
		});


		// Action: Live Text
		const actionLiveText = document.querySelector('#action-livetext');
		let liveInput = actionLiveText.querySelector('textarea');
		
		let liveBtn = actionLiveText.querySelector('button');
		let liveRecord = liveBtn.querySelector('svg.icon-record');
		let liveStop = liveBtn.querySelector('svg.icon-stop');

		let liveId = null;

		liveBtn.addEventListener('click', async () => {
			if (this.roomId !== null) {
				if (this.actionStanby) {
					liveRecord.classList.add('hide');
					liveStop.classList.remove('hide');

					liveInput.disabled = false;
					liveInput.setAttribute('placeholder', "You're live! Type something...");

					liveId = await this.liveNew();
					liveInput.focus();
					liveInput.oninput = () => {
						let content = liveInput.value;
						this.liveUpdate(liveId, content);
					}
					
					dropdownMenuBtn.style.pointerEvents = "none"
					this.actionStanby = false;
				} else {
					liveRecord.classList.remove('hide');
					liveStop.classList.add('hide');

					this.liveEnd(liveId, liveInput.value);
					liveId = null;

					liveInput.disabled = true;
					liveInput.setAttribute('placeholder', "Press the button to start live message...");
					liveInput.oninput = null;
					liveInput.value = "";

					dropdownMenuBtn.style.pointerEvents = "auto"
					this.actionStanby = true;
				}
			}
		});

	}

    changeProfile(profile)
    {
        this.profile = profile;

        if (this.roomId !== null) {
            this.joinRoom(this.roomId, false);

            this.playSound('connect-sfx');
        }
    }

	formatContent(content)
	{
		let escapeHtml = (str) => {
			return str
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;")
				.replace(/'/g, "&#039;");
		};
		
		let renderCodeBlock = (match, codeBlock) => {
			const lines = codeBlock.trim().split('\n');
			return `<div class="mockup-code w-full my-2">
				${lines.map((line, i) => 
					`<pre data-prefix="${i+1}"><code>${escapeHtml(line)}</code></pre>`
				).join('\n')}
			</div>`;
		};

		return content
			.replace(/```([\s\S]*?)```/g, renderCodeBlock)
			.replace(/~(.*?)~/g, '<strike>$1</strike>')
			.replace(/_(.*?)_/g, '<em>$1</em>')
			.replace(/\*(.*?)\*/g, '<b>$1</b>')
			.replace(/`(.*?)`/g, '<code>$1</code>');
	}

    playSound(sfxId)
    {
        const sfx =  this.audios[sfxId];

        sfx.pause();
        sfx.currentTime = 0;
        sfx.play();
    }

	parseTemplate(templateName, data) {
		let tmp = this.templates[templateName];
        
		for (let key in data) {
			tmp = tmp.replaceAll(`{{${key}}}`, data[key]);
		}

		return tmp;
	}

	pushBubble(bubble, callback = () => {}) {
		callback(this);

		this.parent.insertAdjacentHTML("beforeend", bubble);
	}

	async open() {
		const overlay = document.querySelector("#overlay");
		const overlayChildren = overlay.children;
		const onlineIndicator = document.querySelectorAll("#profile .indicator-item");

		if (overlay.classList.contains("closed")) {
			overlayChildren[1].classList.add("hide");
			overlayChildren[0].classList.remove("hide");
			overlay.classList.remove("closed");

			await delay(1000);
		}

		this.parent.innerHTML = "";

		onlineIndicator.forEach((i) => {
			i.classList.remove("hide");
		});

		overlayChildren[1].classList.remove("hide");
		overlayChildren[0].classList.add("hide");

		this.playSound('connect-sfx');

		await delay(500);

		overlay.classList.add("closed");
	}

	close() {
        const overlay = document.querySelector("#overlay");

		if (overlay.classList.contains('closed')) {
			const overlayChildren = overlay.children;
			const onlineIndicator = document.querySelectorAll("#profile .indicator-item");

			onlineIndicator.forEach((i) => {
				i.classList.add("hide");
			});

			overlayChildren[1].classList.add("hide");
			overlayChildren[0].classList.remove("hide");
			overlay.classList.remove("closed");

			this.playSound('disconnect-sfx');
		}
	}

	async joinRoom(roomId, withAnimation = true) {
        if (withAnimation) {
            this.open();
            if (this.roomId !== null) await delay(1200);
            this.roomId = roomId;
        }
        
		this.socket.emit("joinRoom", {
            roomId: this.roomId,
			userId: this.profile.userId,
			username: this.profile.username,
		});
	}

	leaveRoom() {
		this.socket.emit("leaveRoom", {
			userId: this.profile.userId,
		});

        this.close();

		this.roomId = null;
	}

	async sendMessage(content) {
        if (this.roomId !== null) {

            let res = await fetch("/uuid");
			let messageId = await res.text()
            
            this.socket.emit("sendMessage", { 
                messageId,
                roomId: this.roomId, 
                subject: this.profile.username, 
                content,
            });

            this.playSound('send-sfx');

            const date = new Date();
			const hours = date.getHours().toString().padStart(2, "0");
			const minutes = date.getMinutes().toString().padStart(2, "0");

            let bubble = this.parseTemplate("chat-right", {
				id: messageId,
				subject: this.profile.username,
				content: this.formatContent(content),
				time: `${hours}:${minutes}`,
			});

			this.pushBubble(bubble);
        }
	}

	async sendVoice(blob) {
		if (this.roomId !== null) {
			let res = await fetch("/uuid");
			let messageId = await res.text();

			let arrayBuffer = await blob.arrayBuffer();
			let content = encodeBase92(new Uint8Array(arrayBuffer));

			this.socket.emit("sendVoice", { 
                messageId,
                roomId: this.roomId, 
                subject: this.profile.username, 
                content,
            });

			const date = new Date();
			const hours = date.getHours().toString().padStart(2, "0");
			const minutes = date.getMinutes().toString().padStart(2, "0");

            let bubble = this.parseTemplate("audio-right", {
				id: messageId,
				subject: this.profile.username,
				time: `${hours}:${minutes}`,
			});
			
			this.pushBubble(bubble);

			let src = URL.createObjectURL(blob);
			this.renderWave(messageId, src);
		}
	}

	async renderWave(bubbleId, src)
	{	
		const bubble = document.getElementById(bubbleId);

		if (bubble)
		{
			const waveContainer = bubble.querySelector('.wave-container');
			const button = bubble.querySelector('button');
	
			const wavesurfer = WaveSurfer.create({
				container: waveContainer,
				waveColor: '#c800dc',
				progressColor: '#ec6bff',
				cursorColor: 'transparent',
				height: 40,
				barWidth: 5,
				barRadius: 2,
				responsive: true,
				normalize: true
			});
	
			wavesurfer.load(src);
	
			const playBtn = button.querySelector('svg.icon-play');
			const pauseBtn = button.querySelector('svg.icon-pause');
	
			button.onclick = () => {
				if (wavesurfer.isPlaying()) {
					wavesurfer.pause();
	
					playBtn.classList.remove('hide');
					pauseBtn.classList.add('hide');
				} else {
					wavesurfer.play();
	
					pauseBtn.classList.remove('hide');
					playBtn.classList.add('hide');
				}
			};
	
			wavesurfer.on('finish', () => {
				playBtn.classList.remove('hide');
				pauseBtn.classList.add('hide');
			});
		}
	}

	async liveNew()
	{
		if (this.roomId !== null) {
			const res = await fetch("/uuid");
			const messageId = await res.text();
	
			this.socket.emit("newLive", { 
				messageId,
				roomId: this.roomId,
				subject: this.profile.username,
			});
	
			return messageId;
		}
	}

	liveUpdate(messageId, content)
	{
		if (this.roomId !== null) {
			this.socket.emit("updateLive", { 
				messageId,
				roomId: this.roomId,
				content: this.formatContent(content),
			});
		}
	}

	liveEnd(messageId, content)
	{
		if (this.roomId !== null) {
			this.socket.emit("endLive", { 
				messageId,
				roomId: this.roomId,
			});

			const date = new Date();
			const hours = date.getHours().toString().padStart(2, "0");
			const minutes = date.getMinutes().toString().padStart(2, "0");

			let bubble = this.parseTemplate("live-right", {
				id: messageId,
				subject: this.profile.username,
				content: this.formatContent(content),
				time: `${hours}:${minutes}`,
			});
			
			this.pushBubble(bubble);
		}
	}
}

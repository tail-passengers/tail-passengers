import { $ } from "../utils/querySelector.js";
import { navigate } from "../utils/navigate.js";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";


function General({ $app, initialState }) {
	let playerNum = 0, data, intraId, versusId, gameSocket, scoreElement, state = "playing",
		noticeElement, animationFrameId, gameIdValue, gameMode;
	let navBarHeight = $(".navigation-bar").clientHeight;
	let footerHeight = $(".tp-footer-container").clientHeight;
	$("#nav-bar").hidden = true;


	// TODO 소켓끊는 함수 다른 소켓연결에 모두 적용하기, 토너먼트에서 페이지 이동할 때 제너럴로 이동하기.
	// 토너먼트 주소랑 라운드를 스토리지에 저장해서 활용하기, 끝날 때 게임유형 판단하고 결과페이지, 대기 결정하기
	//소켓 끊는 함수

	function clearThreeJs() {
		//게임중 뒤로가기면 소켓 닫기, 아닌 경우는 직접 소켓 처리
		if (state == "playing") {
			gameSocket.close();
			gameSocket = null;
			$("#nav-bar").hidden = false;
		}
		removeScoreElement();
		cancelAnimationFrame(animationFrameId);
		document.removeEventListener('keydown', handleKeyPress);
		document.removeEventListener('keyup', handleKeyRelease);
		window.removeEventListener("popstate", clearThreeJs);
		scene = null;
		camera = null;
		renderer = null;
	}

	this.connectWebSocket = async () => {
		return new Promise((resolve, reject) => {
			gameSocket = new WebSocket(`wss://${process.env.BASE_IP}/ws/${gameMode}/${gameIdValue}/`);

			gameSocket.onopen = () => {
				console.log('WebSocket connected:', `wss://${process.env.BASE_IP}/ws/${gameMode}/${gameIdValue}/`);
				resolve(gameSocket);
			};

			gameSocket.onerror = (error) => {
				reject(error);
			};
		});
	};


	this.makeGame = async () => {
		try {
			// 세션스토리지에 저장된 UUID로 소켓 연결하기
			gameMode = sessionStorage.getItem('gameMode');
			gameIdValue = sessionStorage.getItem('idValue');
			await this.connectWebSocket();
			window.addEventListener("popstate", clearThreeJs);
			if (gameMode == "tournament_game") {
				data = sessionStorage.getItem('Data');
				playerNum = sessionStorage.getItem('playerNum');
				intraId = sessionStorage.getItem('intraId');
				gameSocket.send(data);
				console.log("전송함: ", data);
			}
			console.log(`wss://${process.env.BASE_IP}/ws/${gameMode}/${gameIdValue}/`);
			gameSocket.addEventListener('message', this.onGame);
		}
		catch (error) {
			console.error("Error socket connet:", error);
		}
	};

	this.onGame = (event) => {
		data = JSON.parse(event.data);
		console.log("Received data:", data);
		if (data.message_type == "ready") {
			console.log("Ready!");
			// 플레이어 정보 초기화
			intraId = data.intra_id;
			playerNum = data.number;
			gameSocket.send(event.data);
		}
		else if (data.message_type == "start") {
			// console.log("Start!");
			if (data["1p"] != intraId) {
				versusId = data["1p"];
			}
			else {
				versusId = data["2p"]
			}
			console.log("player info: " + intraId + " " + playerNum + ", " + versusId);
			this.$element.innerHTML = '';
			this.initThreeJs(this.$element);
			this.initEventListeners();
			setTimeout(() => {
				this.startRender();
			}, 2000);
		}
		else if (data.message_type == "score") {
			score.player1 = data.player1_score;
			score.player2 = data.player2_score;
		}
		else if (data.message_type == "end") {
			//제너럴모드는 결과 띄우고 메세지 재전송, 결과메세지 받을 준비
			state = "end";
			clearThreeJs();

			gameSocket.send(event.data);
			//토너먼트 모드는 메세지 재전송, 플레이어에 따라 소켓 연결관리.
			if (gameMode == "tournament_game") {
				if (data.round == "3") {
					sessionStorage.setItem('winner', data.winner);
					sessionStorage.setItem('loser', data.loser);
				}
				else {
					// 졌으면 소켓 끊고 종료
					state = "lose";
					this.$element.innerHTML = endMsg();

				}
			}
		}
		else if (data.message_type == "stay") {
			//제너럴모드는 결과 띄우고 메세지 재전송, 결과메세지 받을 준비
			state = "stay";
			clearThreeJs();
			gameSocket.send(event.data);
			// 이겼으면 새 소켓 연결 후 대기,
			state = "win";
			this.$element.innerHTML = `
					<div class='text-center h1 text-left tp-color-secondary'>Waiting other player...</div>
					<div class='text-center h1 text-left tp-color-secondary'>1 / 2</div>
					<div class="text-center">
					</div>
					`;
			const tournamentName = sessionStorage.getItem('tournamentName');
			sessionStorage.setItem('idValue', `${tournamentName}/3`);
			gameSocket.removeEventListener('message', this.onGame);
			gameSocket.addEventListener('message', this.finalGame);
			gameSocket.send(event.data);
			console.log("Received 대기중 data:", data);
		}
		else if (data.message_type == "error") {
			clearThreeJs();
			this.$element.innerHTML = errorMsg();
		}
		else if (data.message_type == "complete") {
			gameSocket.close();
			let targetURL = `https://${process.env.BASE_IP}/result/${gameIdValue}`;
			navigate(targetURL);
			// $("#nav-bar").hidden = false;
		}
	}

	this.finalGame = (event) => {
		data = JSON.parse(event.data);
		if (data.message_type == "ready") {
			// this.renderPlaying(data);
			console.log('ready');
			// 1p, 2p 나랑 versus 저장
			if (data["1p"] == intraId) {
				playerNum = "player1"
				versusId = data["2p"];
			}
			else {
				playerNum = "player2"
				versusId = data["1p"];
			}
			sessionStorage.setItem('playerNum', playerNum);
			sessionStorage.setItem('Data', JSON.stringify(data));
			const tournamentName = sessionStorage.getItem('tournamentName');
			const tournamentURL = `${tournamentName}/3`;
			sessionStorage.setItem('idValue', tournamentURL);
			const targetURL = `https://${process.env.BASE_IP}/tournament_game/${tournamentURL}`;
			navigate(targetURL);
			// 저장된 토너먼트 모드, 토너먼트방이름, 라운드 합쳐서 스토리지에 저장 후 게임 연결
		}
	}



	const endMsg = () => {
		return `
        <div class="tp-sl-card-content-child">
            <div>
                <div class="loadingMsg default-container text-center tp-color-secondary">
                    <div class="h2">End game!</div>
                </div>
            </div>
        </div>
    `;
	};

	const errorMsg = () => {
		return `
        <div class="tp-sl-card-content-child">
            <div>
                <div class="loadingMsg default-container text-center tp-color-secondary">
                    <div class="h2">Error game!</div>
                </div>
            </div>
        </div>
    `;
	};


	let WIDTH = window.innerWidth,                                 //canvas.css에서 반응형으로 처리
		HEIGHT = window.innerHeight - (navBarHeight + footerHeight), //canvas.css에서 반응형으로 처리
		VIEW_ANGLE = 45,
		ASPECT = WIDTH / HEIGHT,
		NEAR = 1,
		FAR = 10000,
		FIELD_WIDTH = 1200,
		FIELD_LENGTH = 3000,
		BALL_RADIUS = 20,
		PADDLE_WIDTH = 200,
		PADDLE_HEIGHT = 30,

		mainLight, subLight,
		ball, direction = -1, paddle1, paddle2, field, running = false,
		randomOffset = 0,
		rotationSpeed = 0.01,
		score = {
			player1: "0",
			player2: "0"
		};

	let scene, camera, camera2, renderer;

	let wand1, wand2, wandRotationSpeed = 0.03;

	let isKeyPressed = false;
	let lastKeyPressTime = 0;


	const wandLoader1 = new GLTFLoader();
	const wandLoader2 = new GLTFLoader();

	// Initialize the Three.js scene, camera, and renderer
	function resizeRenderer(renderer) {
		const canvas = renderer.domElement;
		const width = window.innerWidth;
		const height = window.innerHeight - (navBarHeight + footerHeight);
		const needResize = canvas.width !== width || canvas.height !== height;
		if (needResize) {
			renderer.setSize(width, height, false);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
		}
		return needResize;
	}



	this.render = () => {
		// if (resizeRenderer(renderer)) {
		// 	const canvas = renderer.domElement;
		// 	camera.aspect = canvas.clientWidth / canvas.clientHeight;
		// 	camera.updateProjectionMatrix();
		// 	renderer.render(scene, camera);
		// }
		if (running) {
			animationFrameId = requestAnimationFrame(() => {
				this.render();
			});
			ball.rotation.y += 0.03;
			ball.rotation.x += rotationSpeed;

			paddle1.position.x = data.paddle1;
			paddle2.position.x = data.paddle2;
			if (playerNum == "player1") {
				camera.position.x = paddle1.position.x;
			}
			else if (playerNum == "player2") {
				camera.position.x = paddle2.position.x;
			}
			updateScore();
			// camera2.position.x = paddle2.position.x;
			ball.position.x = data.ball_x;
			ball.position.y = data.ball_y;
			ball.position.z = data.ball_z;
			ball.$velocity.x = data.ball_vx;
			ball.$velocity.z = data.ball_vz;


			//camera1
			renderer.setViewport(0, 0, WIDTH, HEIGHT);
			renderer.setScissor(0, 0, WIDTH, HEIGHT);
			renderer.setScissorTest(true);
			renderer.render(scene, camera);

			//camera2
			// renderer.setViewport(WIDTH / 2, 0, WIDTH / 2, HEIGHT);
			// renderer.setScissor(WIDTH / 2, 0, WIDTH / 2, HEIGHT);
			// renderer.setScissorTest(true);
			// renderer.render(scene, camera2);

			// if (ball.$velocity.z < 0) {
			// 	processCpuPaddle();
			// }
		}
	}

	// 패들 scene에 추가
	function addPaddle(paddleColor, opacity) {
		let paddleGeometry = new THREE.BoxGeometry(PADDLE_WIDTH, PADDLE_HEIGHT, 10, 1, 1, 1),
			paddleMaterial = new THREE.MeshLambertMaterial({
				color: paddleColor,
				transparent: true,
				opacity: opacity !== undefined ? opacity : 1
			}),
			paddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
		scene.add(paddle);
		return paddle;
	}


	async function loadAssets() {
		await loadWanders(wandLoader1);
		await loadWanders(wandLoader2);
	}
	async function loadWanders(wandLoader) {
		return new Promise((resolve, reject) => {
			let wandDir, wand;
			if (wandLoader === wandLoader1) {
				wandDir = '../../public/assets/gltf/wand/harry_potters_wand.glb'
			} else {
				wandDir = '../../public/assets/gltf/wand/the_elder_wand.glb'
			}
			wandLoader.load(
				wandDir,
				function (gltf) {
					wand = gltf.scene;
					wand.scale.set(10, 10, 10);
					wand.name = 'wand';
					if (wandLoader === wandLoader1) {
						wand1 = wand;
						paddle1.add(wand1);
						wand1.rotation.x = Math.PI / 9;
						wand1.position.z += 130;
					} else if (wandLoader === wandLoader2) {
						wand2 = wand;
						paddle2.add(wand2);
						wand2.rotation.y -= Math.PI * 0.46;
						wand2.rotation.x = Math.PI * 0.85;
						wand2.position.y -= 35;
						wand2.position.z -= 140;
					}
					resolve();
				},
				undefined,
				function (error) {
					console.error(error);
					reject(error);
				}
			);
		});
	}

	this.initThreeJs = async (contentDiv) => {
		scene = new THREE.Scene();
		if (playerNum == "player1") {
			camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
			camera.position.set(0, 100, (FIELD_LENGTH / 2) + 500);
			scene.add(camera);
		}
		else if (playerNum == "player2") {
			camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
			camera.position.set(0, 100, (FIELD_LENGTH / 2) - 3500);
			camera.rotateY(Math.PI);
			scene.add(camera);
		}

		// camera2 = new THREE.PerspectiveCamera(VIEW_ANGLE / 2, ASPECT / 2, NEAR, FAR);
		// camera2.position.set(0, 100, (FIELD_LENGTH / 2) - 4000);
		// camera2.rotateY(Math.PI);
		// scene.add(camera2);


		renderer = new THREE.WebGLRenderer();
		renderer.setSize(WIDTH, HEIGHT);
		renderer.setClearColor(0x000000, 1);
		renderer.domElement.classList.add("tp-th-canvas");
		if (contentDiv) {
			contentDiv.appendChild(renderer.domElement);
		}

		// field
		let fieldGeometry = new THREE.BoxGeometry(FIELD_WIDTH, 5, FIELD_LENGTH, 1, 5, 1),
			fieldMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 }); //color: 0x442200
		field = new THREE.Mesh(fieldGeometry, fieldMaterial);
		field.position.set(0, -120, 0);
		scene.add(field);

		// floor texture
		const woodTextureLoader = new THREE.TextureLoader();
		const woodTexture = woodTextureLoader.load('../../public/assets/img/carpet.png')
		const floorMaterial = new THREE.MeshStandardMaterial({ map: woodTexture });
		let floorGeometry = new THREE.BoxGeometry(FIELD_WIDTH, 5, FIELD_LENGTH, 1, 1, 1);
		let floor = new THREE.Mesh(floorGeometry, floorMaterial);
		floor.position.set(0, -120, 0);
		scene.add(floor);


		// wall texture
		const wallTextureLoader = new THREE.TextureLoader();
		let wallTexture = wallTextureLoader.load('../../public/assets/img/wall.png'); // 벽면 텍스쳐 파일 경로로 수정
		const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture });
		let wallGeometry = new THREE.BoxGeometry(5, HEIGHT, FIELD_LENGTH, 1, 1, 1);
		let leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
		leftWall.position.set(-FIELD_WIDTH / 2 - 2.5, 250, 0);
		scene.add(leftWall);
		let rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
		rightWall.position.set(FIELD_WIDTH / 2 + 2.5, 250, 0);
		scene.add(rightWall);

		// backwall
		const backWallTextureLoader = new THREE.TextureLoader();
		const backWallTexture = backWallTextureLoader.load('../../public/assets/img/backwall.png');
		const backWallMaterial = new THREE.MeshStandardMaterial({ map: backWallTexture });
		const backWallGeometry = new THREE.BoxGeometry(FIELD_WIDTH + 500, HEIGHT + 500, 5, 1, 1, 1);
		const backWall = new THREE.Mesh(backWallGeometry, backWallMaterial);
		backWall.position.set(0, 250, -2500);
		scene.add(backWall);

		//frontwall
		const frontWallTextureLoader = new THREE.TextureLoader();
		const frontWallTexture = frontWallTextureLoader.load('../../public/assets/img/backwall.png');
		const frontWallMaterial = new THREE.MeshStandardMaterial({ map: frontWallTexture });
		const frontWallGeometry = new THREE.BoxGeometry(FIELD_WIDTH + 500, HEIGHT + 500, 5, 1, 1, 1);
		const frontWall = new THREE.Mesh(frontWallGeometry, frontWallMaterial);
		frontWall.position.set(0, 250, 2500);
		scene.add(frontWall);

		// ceiling texture 
		const ceilingTextureLoader = new THREE.TextureLoader();
		const ceilingTexture = ceilingTextureLoader.load('../../public/assets/img/ceiling.jpeg'); // 천장 텍스처 파일 경로로 수정
		const ceilingMaterial = new THREE.MeshStandardMaterial({ map: ceilingTexture });
		let ceilingGeometry = new THREE.BoxGeometry(FIELD_WIDTH, 5, FIELD_LENGTH, 1, 1, 1);
		let ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
		ceiling.position.set(0, 570, 0);
		scene.add(ceiling);

		// light 
		mainLight = new THREE.HemisphereLight(0xFFFFFF, 0x444455); //빛 색, 그림자 색
		scene.add(mainLight);
		subLight = new THREE.PointLight(0xffffff, 1); // 빛 색, 밝기
		subLight.position.set(0, 400, 0);
		scene.add(subLight);

		// ball 
		const ballGeometry = new THREE.IcosahedronGeometry(BALL_RADIUS, 0);
		const ballMaterial = new THREE.MeshLambertMaterial({
			color: 0xFF9900,
			emissive: 0xFF9900
		});

		ball = new THREE.Mesh(ballGeometry, ballMaterial);
		scene.add(ball);

		ball.$velocity = {
			x: 0,
			z: direction * 10
		};

		// paddle 
		paddle1 = addPaddle(0xFFFFFF, 0.7);
		paddle1.position.z = FIELD_LENGTH / 2;
		paddle1.position.x = 0;
		paddle1.position.y = 0;
		paddle2 = addPaddle(0xFFFFFF, 0.8);
		paddle2.position.z = -FIELD_LENGTH / 2;
		paddle2.position.x = 0;
		paddle2.position.y = 0;

		// wand
		await loadAssets();

		// scoreborad
		renderer.domElement.style.cursor = 'none';
		renderer.domElement.style.zIndex = '0';

		scoreElement = document.createElement('div');
		scoreElement.textContent = '';
		scoreElement.style.fontSize = '120%';
		scoreElement.style.position = 'absolute';
		scoreElement.style.top = '10px';
		scoreElement.style.left = '10px';
		scoreElement.style.color = '#ffffff';
		scoreElement.style.zIndex = '1';
		const canvasRect = renderer.domElement.getBoundingClientRect();
		scoreElement.style.top = `${canvasRect.top + 10}px`;
		scoreElement.style.left = `${canvasRect.left + 10}px`;
		document.body.appendChild(scoreElement);


		noticeElement = document.createElement('div');
		noticeElement.textContent = 'Get ready to Protego spell!';
		noticeElement.style.fontSize = '200%';
		noticeElement.style.position = 'absolute';
		noticeElement.style.top = '50%';
		noticeElement.style.left = '50%';
		noticeElement.style.transform = 'translate(-50%, -50%)';
		noticeElement.style.color = '#ffffff';
		noticeElement.style.zIndex = '1';
		const canvasWidth = renderer.domElement.width;
		const canvasHeight = renderer.domElement.height;

		// noticeElement의 너비와 높이를 가져옴
		const elementWidth = noticeElement.offsetWidth;
		const elementHeight = noticeElement.offsetHeight;
		// 캔버스의 중앙 좌표 계산
		const centerX = canvasWidth / 2;
		const centerY = canvasHeight / 2;
		// 요소의 위치 계산
		const leftPosition = (centerX - (elementWidth / 2)) / canvasWidth * 100;
		const topPosition = (centerY - (elementHeight / 2)) / canvasHeight * 100;
		// 스타일 설정
		noticeElement.style.position = 'absolute';
		noticeElement.style.top = `${topPosition}%`;
		noticeElement.style.left = `${leftPosition}%`;
		document.body.appendChild(noticeElement);

	}
	// 스코어 업데이트 함수
	function updateScore() {
		if (noticeElement.parentNode) {
			noticeElement.parentNode.removeChild(noticeElement);
		}
		if (playerNum == "player1") {
			scoreElement.textContent = `${intraId} ${score.player1}:${score.player2} ${versusId}`;
		}
		else if (playerNum == "player2") {
			scoreElement.textContent = `${intraId} ${score.player2}:${score.player1} ${versusId}`;
		}
	}
	function removeScoreElement() {
		if (scoreElement.parentNode) {
			scoreElement.parentNode.removeChild(scoreElement);
		}
	}


	// 완드 회전 애니메이션
	function animateWands() {
		wand1.rotation.y += wandRotationSpeed;
		wand2.rotation.y += wandRotationSpeed;
	}

	this.setState = (content) => {
		this.state = content;
	};

	// bot 모드 paddle 이동
	function processCpuPaddle() {
		let ballPos = ball.position,
			cpuPos = paddle2.position;
		camera2.position.x = paddle2.position.x;

		if (cpuPos.x - 100 > ballPos.x) {
			cpuPos.x -= Math.min(cpuPos.x - ballPos.x + randomOffset, 12);
		} else if (cpuPos.x - 100 < ballPos.x) {
			cpuPos.x += Math.min(ballPos.x - cpuPos.x + randomOffset, 12);
		}
	}
	function updateRandomOffset() {
		// -25에서 25 사이의 랜덤한 값
		randomOffset = Math.random() * 205 - 95;
		// CPU 패들의 위치에 랜덤값을 더하여 업데이트
		paddle2.position.x += randomOffset;
	}

	function reset() {
		ball.position.set(0, 0, 0);

		BALL_RADIUS = 20;
		ball.geometry.dispose();
		ball.geometry = new THREE.IcosahedronGeometry(BALL_RADIUS, 0);
		ball.material.emissive.setHex(0xFF9900);

		rotationSpeed = 0.02;
	}
	function stopBall() {
		ball.$stopped = true;
	}
	this.startRender = () => {
		running = true;
		this.render();

	}

	// 마우스 이동 동작
	function containerMouseMove(e) {
		let mouseX = e.clientX;
		let halfPaddleWidth = PADDLE_WIDTH / 2;
		let maxX = FIELD_WIDTH / 2 - halfPaddleWidth;
		let minX = -maxX;
		camera.position.x = paddle1.position.x = Math.max(minX, Math.min(maxX, -((WIDTH - mouseX) / WIDTH * FIELD_WIDTH) + (FIELD_WIDTH / 2)));
	}

	// 키 입력 동작
	function handleKeyPress(event) {
		keyState[event.code] = true;
		let keyPressSend = {
			number: playerNum,
			input: 0,
			message_type: "playing"
		}
		if (event.code == 'ArrowLeft') {
			keyPressSend.input = "left_press";
		}
		else if (event.code == 'ArrowRight') {
			keyPressSend.input = "right_press";
		}
		gameSocket.send(JSON.stringify(keyPressSend));
		keyAction(event.code);
	}
	function handleKeyRelease(event) {
		keyState[event.code] = false;
		let keyPressSend = {
			number: playerNum,
			input: 0,
			message_type: "playing"
		}
		if (event.code == 'ArrowLeft') {
			keyPressSend.input = "left_release";
		}
		else if (event.code == 'ArrowRight') {
			keyPressSend.input = "right_release";
		}
		gameSocket.send(JSON.stringify(keyPressSend));
	}




	// 맥시마 키액션
	function keyAction(code) {
		const currentTime = new Date().getTime();
		if (currentTime - lastKeyPressTime < 1000 && isKeyPressed) {
			return;
		}
		if (code === 'ArrowUp') {
			if (shouldPerformAction(code) && !isKeyPressed) {
				console.log("Critical!");
				// 맥시마 받았을 때도 발동하기
				blinkEffect();
				if (ball && ball.$velocity) {
					if (ball.$velocity.z < 0) {
						ball.$velocity.z -= 4;
					} else {
						ball.$velocity.z += 4;
					}
				}
				isKeyPressed = true;

				// 현재 시간을 lastSpaceBarPressTime에 저장
				lastKeyPressTime = currentTime;

				// 지연 시간 후에 isKeyPressed를 false로 설정하여 다시 스페이스바 입력을 받을 수 있도록 함
				setTimeout(() => {
					isKeyPressed = false;
				}, 500); // 적절한 지연 시간 설정 (예: 1초)
			}
		}
	}

	function blinkEffect() {
		// 초기값 저장
		let initialEmissive = ball.material.emissive.getHex();
		console.log(initialEmissive);
		if (initialEmissive > 0xFF0900) {
			initialEmissive -= 0x001000;
		}

		// 반짝임 효과를 위한 애니메이션
		const blinkDuration = 400; // 반짝임 지속 시간 (밀리초)
		const blinkIntensity = 5000000; // 반짝임 강도

		let startTime;
		function blink(timestamp) {
			if (!startTime) startTime = timestamp;

			const elapsed = timestamp - startTime;
			const progress = elapsed / blinkDuration;

			// 반짝임 효과 계산 (예: sine 함수를 사용하여 굴절적인 반짝임)
			const intensity = Math.sin(progress * Math.PI * 2) * blinkIntensity;

			// 새로운 emissive 값 설정
			const newEmissive = initialEmissive + intensity;

			// 반짝임이 완료되면 애니메이션 종료
			if (elapsed < blinkDuration) {
				ball.material.emissive.setHex(newEmissive);
				//TODO 활성화
				requestAnimationFrame(blink);
			} else {
				// 반짝임이 완료되면 초기값으로 재설정
				ball.material.emissive.setHex(initialEmissive);
			}
		}
		//TODO 활성화
		// 애니메이션 시작
		requestAnimationFrame(blink);
	}

	function shouldPerformAction(code) {
		// 특정 조건을 만족하면 true를 반환하여 동작을 수행하도록 함
		// 예를 들어, 공이 패들에 닿기 직전, 닿았을 때, 또는 패들에 맞고 튕겨 나간 직후에 해당하는 조건을 확인하여 반환
		return isBallNearPaddle(code)
	}

	function isBallNearPaddle(code) {
		// 공이 패들에 닿기 직전의 조건을 판단
		// 예를 들어, 특정 거리 이내에 있을 때 true를 반환
		if (playerNum == 'player1') {
			return Math.abs(ball.position.z - paddle1.position.z) < 50;
		}
		else if (playerNum == 'player2') {
			return Math.abs(ball.position.z - paddle2.position.z) < 50;
		}
	}


	// 키 상태 저장 객체
	const keyState = {
		KeyA: false,  // A 키
		KeyD: false,  // D 키
		ArrowLeft: false,  // 왼쪽 화살표
		ArrowRight: false,  // 오른쪽 화살표
	};

	// 키입력 이벤트 리스너 등록
	this.initEventListeners = () => {
		document.addEventListener('keydown', handleKeyPress);
		document.addEventListener('keyup', handleKeyRelease);
		window.addEventListener('beforeunload', removeScoreElement)
		// renderer.domElement.addEventListener('mousemove', containerMouseMove);
		// renderer.domElement.addEventListener('click', onMouseClick);
	}



	// 페이지에 들어갈 state를 설정해 각각 페이지를 띄우는 함수
	this.state = initialState;
	this.$element = document.createElement("div");
	this.$element.className = "content default-container";

	// 기본적인 SPA 페이지 로드동작
	this.init = () => {
		let parent = $("#app");
		const child = $(".content");
		if (child) {
			parent.removeChild(child);
			parent.appendChild(this.$element);
		}
		let body = $("body");
		const canvas = $("canvas");
		if (canvas) {
			body.removeChild(canvas);
		}
		this.makeGame();
	};

	this.init();
}

export default General;

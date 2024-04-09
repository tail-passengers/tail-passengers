import { $ } from "../utils/querySelector.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import * as THREE from "three";

function SocketTest({ $app, initialState }) {
	let playerNum = 0, status = "ready", data;
	let navBarHeight = $(".navigation-bar").clientHeight;
	let footerHeight = $(".tp-footer-container").clientHeight;

	// 세션스토리지에 저장된 UUID로 소켓 연결하기
	const gameIdValue = sessionStorage.getItem('gameIdValue');
	const gameSocket = new WebSocket(`wss://${process.env.BASE_IP}/ws/general_game/${gameIdValue}/`);

	// 값이 변경될 때 지정된 함수를 실행하는 프록시 객체
	const handleReady = (newValue) => {
		console.log('status가 변경되었습니다:', newValue);
		this.$element.innerHTML = watingMsg();
		setTimeout(() => {
			this.$element.innerHTML = '';

			initThreeJs(this.$element);
			animate();
			initEventListeners();

		}, 3000);
	};

	const handlePlaying = (newValue) => { }
	const handleScore = (newValue) => { }
	const handleEnd = () => {
		console.log("end!");
		scene = null;
		camera = null;
		renderer = null;
		document.removeEventListener('keydown', handleKeyPress);
		document.removeEventListener('keyup', handleKeyRelease);
		renderer.domElement.removeEventListener('mousemove', containerMouseMove);
		cancelAnimationFrame(animationFrameId);
		gameSocket.close();
	}

	const playerStatusProxy = new Proxy({ value: status }, {
		set: function (target, key, value) {
			if (value == "ready") {
				handleReady(value);
			}
			else if (value == "playing") {
				handlePlaying(value);
			}
			else if (value == "score") {
				handleScore(value);
			}
			else if (value == "end") {
				handleEnd(value);
			}
			return true;
		}
	});

	// Get ready 메세지 출력
	const watingMsg = () => {
		return `
        <div class="tp-sl-card-content-child">
            <div>
                <div class="loadingMsg default-container text-center tp-color-secondary">
                    <div class="h2">Get ready to Protego spell!</div>
                </div>
            </div>
        </div>
    `;
	};

	//TODO	 값 받아오기, 갱신하기, 키입력 전달하기
	const onPlaying = (event) => {
		// console.log("받습니당" + event.data);
		data = JSON.parse(event.data);
		if (playerStatusProxy.value != data.message_type) {
			playerStatusProxy.value = data.message_type;
		}
	}

	// 초기 메세지 수신 이벤트 리스너 핸들. 
	const getReady = (event) => {
		console.log(event.data);
		let data = JSON.parse(event.data); // JSON 문자열을 JavaScript 객체로 변환
		playerNum = data.number; // 플레이어 부여받음 !!

		console.log("I am : " + playerNum);
		gameSocket.send(event.data);

		playerStatusProxy.value = status; // 프록시 객체 값 변경, 핸들함수 실행
		gameSocket.removeEventListener('message', getReady);//기존 메세지 리스너 제거
		gameSocket.addEventListener('message', onPlaying);// 새로운 메세지리스너 등록
		playerStatusProxy.value = "playing"; // 프록시 객체 값 변경, 핸들함수 실행
	}

	gameSocket.addEventListener('message', getReady); // 호이스팅 안되게 주의해서 위칭 볼 것


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
		ball, ballRendered = false, direction = -1, paddle1, paddle2, field, running,
		randomOffset = 0,
		rotationSpeed = 0.01,
		scoreTextMesh, font,
		score = {
			player1: 0,
			player2: 0
		};

	let scene, camera, camera2, renderer;

	let wand1, wand2, wandRotationSpeed = 0.03;

	let isKeyPressed = false;
	let lastKeyPressTime = 0;


	const wandLoader1 = new GLTFLoader();
	const wandLoader2 = new GLTFLoader();

	// Initialize the Three.js scene, camera, and renderer
	function resizeRenderer(renderer) {
		let navBarHeight = $(".navigation-bar").clientHeight;
		let footerHeight = $(".tp-footer-container").clientHeight;
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



	function render() {
		if (resizeRenderer(renderer)) {
			const canvas = renderer.domElement;
			camera.aspect = canvas.clientWidth / canvas.clientHeight;
			camera.updateProjectionMatrix();
			renderer.render(scene, camera);
		}
		if (running) {
			requestAnimationFrame(render);
			// processBallMovement();
			paddle1.position.x = data.paddle1;
			paddle2.position.x = data.paddle2;
			if (playerNum == "player1") {
				camera.position.x = paddle1.position.x;
			}
			else if (playerNum == "player2") {
				camera.position.x = paddle2.position.x;
			}
			// camera2.position.x = paddle2.position.x;
			ball.position.x = data.ball_x;
			ball.position.y = data.ball_y;
			ball.position.z = data.ball_z;
			ball.$velocity.x = data.ball_vx;
			ball.$velocity.z = data.ball_vz;

			updateScoreBoard(score.player1, score.player2);
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
	// scene에 완드 추가
	function loadWanders(wandLoader) {
		return new Promise((resolve, reject) => {
			addWand(wandLoader1).then(() => addWand(wandLoader2)).then(() => resolve());
		});
	}
	function addWand(wandLoader) {
		return new Promise((resolve, reject) => {
			let wand;
			let wandDir;
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

					// scene.add(wand);

					// wand1, wand2에 대한 변수 설정 및 resolve 호출
					if (wandLoader === wandLoader1) {
						wand1 = wand;
						paddle1.add(wand1);
						// wand1.rotation.y = 0;
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

	function initThreeJs(contentDiv) {

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
		loadWanders(wandLoader1).then(() => loadWanders(wandLoader2)).then(() => {
			startRender();
		});

		// scoreborad
		const loader = new FontLoader();
		let textGeometry;
		loader.load('../../public/assets/font/Playfair.json', (loadedFont) => {
			font = loadedFont;
			textGeometry = new TextGeometry('ready', {
				font: font,
				size: 1,
				height: 0.1
			});
		});
		const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
		scoreTextMesh = new THREE.Mesh(textGeometry, textMaterial);
		if (playerNum == "player1") {
			scoreTextMesh.position.set(-200, 450, 700);
			scene.add(camera);
		}
		else if (playerNum == "player2") {
			scoreTextMesh.position.set(200, 450, -700);
			scoreTextMesh.rotateY(Math.PI);
		}
		scene.add(scoreTextMesh);




		renderer.domElement.style.cursor = 'none';
	}

	// 완드 회전 애니메이션
	function animateWands() {
		wand1.rotation.y += wandRotationSpeed;
		wand2.rotation.y += wandRotationSpeed;
	}

	// Animation function
	function animate() {
		requestAnimationFrame(animate);

		// if (ballRendered) {
		// 	animateWands();
		// }
		if (ball) {
			ball.rotation.y += 0.03;
			ball.rotation.x += rotationSpeed;

			renderer.render(scene, camera);
		}
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

	// 스코어 카운트 후 위치 리셋 함수
	function updateScoreBoard(score1, score2) {
		if (scoreTextMesh && font) {
			const newScoreText = `Player 1: ${score1} | Player 2: ${score2}`;

			// 이전 스코어와 현재 스코어를 비교하여 변동이 있을 때에만 업데이트
			if (scoreTextMesh.userData.previousScore !== newScoreText) {
				console.log("active!");
				scoreTextMesh.geometry.dispose(); // 기존의 점수판 지우기
				const newTextGeometry = new TextGeometry(newScoreText, {
					font: font,
					size: 30,
					height: 0.1
				});
				scoreTextMesh.geometry = newTextGeometry; // 새로운 점수판 생성

				// 현재 스코어를 이전 스코어로 업데이트
				scoreTextMesh.userData.previousScore = newScoreText;
			}
		}
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
	function startRender() {
		running = true;
		render();
	}
	function stopRender() {
		running = false;
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
		if (code === 'KeyW' || code === 'ArrowUp') {
			if (shouldPerformAction(code) && !isKeyPressed && !isPastPaddle1() && !isPastPaddle2()) {
				console.log("Critical!");
				blinkEffect();
				if (ball && ball.$velocity) {
					if (ball.$velocity.z < 0) {
						ball.$velocity.z -= 4;
					} else {
						ball.$velocity.z += 4;
					}
				}
				updateBallSize();
				isKeyPressed = true;

				// 현재 시간을 lastSpaceBarPressTime에 저장
				lastSpaceBarPressTime = currentTime;

				// 지연 시간 후에 isKeyPressed를 false로 설정하여 다시 스페이스바 입력을 받을 수 있도록 함
				setTimeout(() => {
					isKeyPressed = false;
				}, 500); // 적절한 지연 시간 설정 (예: 1초)
			}
		}
	}

	function updateBallSize() {
		// 회전 속도증가
		rotationSpeed += 0.008;
		// 크기 증가
		if (BALL_RADIUS < 50) {
			BALL_RADIUS += 5;
		}
		const newGeometry = new THREE.IcosahedronGeometry(BALL_RADIUS, 0);
		ball.geometry.dispose();
		ball.geometry = newGeometry;
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
				requestAnimationFrame(blink);
			} else {
				// 반짝임이 완료되면 초기값으로 재설정
				ball.material.emissive.setHex(initialEmissive);
			}
		}

		// 애니메이션 시작
		requestAnimationFrame(blink);
	}

	function shouldPerformAction(code) {
		// 특정 조건을 만족하면 true를 반환하여 동작을 수행하도록 함
		// 예를 들어, 공이 패들에 닿기 직전, 닿았을 때, 또는 패들에 맞고 튕겨 나간 직후에 해당하는 조건을 확인하여 반환
		return isBallNearPaddle(code) || isBallJustBouncedOffPaddle(); // ||isBallTouchingPaddle(code)
	}

	function isBallNearPaddle(code) {
		// 공이 패들에 닿기 직전의 조건을 판단
		// 예를 들어, 특정 거리 이내에 있을 때 true를 반환
		if (code == 'KeyW') {
			return Math.abs(ball.position.z - paddle1.position.z) < 50;
		}
		else if (code == 'ArrowUp') {
			return Math.abs(ball.position.z - paddle2.position.z) < 50;
		}
	}

	function isBallTouchingPaddle(code) {
		// 공이 패들에 닿았을 때의 조건을 판단
		// 예를 들어, 패들과 공의 충돌 여부를 확인하여 true를 반환
		if (code == 'KeyA') {
			return isPaddle1Collision();
		}
		else if (code == 'ArrowUp') {
			return isPaddle2Collision();
		}
	}

	function isBallJustBouncedOffPaddle() {
		// 공이 패들에 맞고서 튕겨 나간 직후의 조건을 판단
		// 예를 들어, 패들과의 충돌 여부와 이전에 패들에 맞았는지 여부를 확인하여 true를 반환
		const hasBouncedOffPaddle = isBallTouchingPaddle();
		const wasTouchingPaddle = ball.wasTouchingPaddle || false;

		return hasBouncedOffPaddle && !wasTouchingPaddle;
	}

	// 키 상태 저장 객체
	const keyState = {
		KeyA: false,  // A 키
		KeyD: false,  // D 키
		ArrowLeft: false,  // 왼쪽 화살표
		ArrowRight: false,  // 오른쪽 화살표
	};

	// 키입력 이벤트 리스너 등록
	function initEventListeners() {
		document.addEventListener('keydown', handleKeyPress);
		document.addEventListener('keyup', handleKeyRelease);
		renderer.domElement.addEventListener('mousemove', containerMouseMove);
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
	};

	this.init();
}

export default SocketTest;

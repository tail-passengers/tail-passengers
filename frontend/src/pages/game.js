import { $ } from "../utils/querySelector.js";

/*
 * TODO
 * 스코어판 만들기, 결과판도 결과
 * 튜토리얼 안내문 만들기
 * 커스텀 요소 (볼 유형, 컬러, 난이도)
 * 
 * BUG
 * 게임 결과, 페이지 이동시 종료되도록 (소켓)
 * 리사이즈
 * 볼 스페이스 액션 공 튀기는 문제
 * 상대도 적용되게 할 것인지?, 1초 딜레이로 할 것인지?(연타도 아직 가능)
 * 볼 벽에 붙어서 안떨어지는 문제
 * 
*/


function Example({ $app, initialState }) {
	let navBarHeight = $(".navigation-bar").clientHeight;
	let footerHeight = $(".tp-footer-container").clientHeight;

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

		// //get the scoreboard element.
		// scoreBoard = document.getElementById('scoreBoard'),


		mainLight, subLight,
		ball, ballRendered = false, paddle1, paddle2, field, running,
		randomOffset = 0,
		rotationSpeed = 0.01,
		score = {
			player1: 0,
			player2: 0
		};

	let scene, camera, camera2, renderer;

	let paddleCnt = 0;
	let wand1, wand2, wandRotationSpeed = 0.03;

	let isSpaceBarPressed = false;
	let lastSpaceBarPressTime = 0;


	const wandLoader1 = new GLTFLoader();
	const wandLoader2 = new GLTFLoader();

	// 페이지에 들어갈 state를 설정해 각각 페이지를 띄우는 함수
	this.state = initialState;
	this.$element = document.createElement("div");
	this.$element.className = "content default-container";

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

			//camera1
			processBallMovement();
			renderer.setViewport(0, 0, WIDTH / 2, HEIGHT);
			renderer.setScissor(0, 0, WIDTH / 2, HEIGHT);
			renderer.setScissorTest(true);
			renderer.render(scene, camera);

			//camera2
			processBallMovement();
			renderer.setViewport(WIDTH / 2, 0, WIDTH / 2, HEIGHT);
			renderer.setScissor(WIDTH / 2, 0, WIDTH / 2, HEIGHT);
			renderer.setScissorTest(true);
			renderer.render(scene, camera2);

			// if (ball.$velocity.z < 0) {
			// 	processCpuPaddle();
			// }
		}
	}

	function initThreeJs(contentDiv) {
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(VIEW_ANGLE / 2, ASPECT / 2, NEAR, FAR);
		camera.position.set(0, 100, (FIELD_LENGTH / 2) + 1000);
		scene.add(camera);

		camera2 = new THREE.PerspectiveCamera(VIEW_ANGLE / 2, ASPECT / 2, NEAR, FAR);
		camera2.position.set(0, 100, (FIELD_LENGTH / 2) - 4000);
		camera2.rotateY(Math.PI);
		scene.add(camera2);


		renderer = new THREE.WebGLRenderer();
		renderer.setSize(WIDTH, HEIGHT);
		renderer.setClearColor(0x000000, 1);
		renderer.domElement.classList.add("tp-th-canvas");
		if (contentDiv) {
			contentDiv.appendChild(renderer.domElement);
		}

		const scoreBoard = $("#scoreBoard");
		if (scoreBoard) {
			scoreBoard.classList.add("visually-hidden");
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
			updateScoreBoard();
			startRender();
		});

		renderer.domElement.addEventListener('mousemove', containerMouseMove);
		renderer.domElement.style.cursor = 'none';

	}


	function animateWands() {
		// 완드 회전 애니메이션
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

	// Start animation loop
	function startAnimation() {
		animate();
	}

	this.setState = (content) => {
		this.state = content;
		this.render();
	};

	this.render = () => {
		// Render component contents here
		this.$element.innerHTML = `
			<h3 id="scoreBoard"></h3>
    `;
	};

	function startBallMovement() {
		let direction = Math.random() > 0.5 ? -1 : 1;
		ball.$velocity = {
			x: 0,
			z: direction * 10
		};
		ball.$stopped = false;
		ballRendered = true;
	}

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

	function processBallMovement() {
		if (!ball.$velocity) {
			startBallMovement();
		}

		if (ball.$stopped) {
			return;
		}

		updateBallPosition();

		if (isSideCollision()) {
			ball.$velocity.x *= -1;
		}

		if (isPaddle1Collision()) {
			hitBallBack(paddle1);
			// updateRandomOffset(); //cpu용 랜덤 패들위치설정
		}

		if (isPaddle2Collision()) {
			hitBallBack(paddle2);

		}

		if (isPastPaddle1()) {
			scoreBy('player2');
		}

		if (isPastPaddle2()) {
			scoreBy('player1');
		}
	}

	function updateRandomOffset() {
		// -25에서 25 사이의 랜덤한 값
		randomOffset = Math.random() * 205 - 95;
		// CPU 패들의 위치에 랜덤값을 더하여 업데이트
		paddle2.position.x += randomOffset;
	}

	function isPastPaddle1() {
		return ball.position.z > paddle1.position.z + 5;
	}

	function isPastPaddle2() {
		return ball.position.z < paddle2.position.z - 5;
	}

	function updateBallPosition() {
		let ballPos = ball.position;

		// 패들과 충돌 여부
		ball.wasTouchingPaddle = isBallTouchingPaddle();

		// update the ball's position.
		ballPos.x += ball.$velocity.x;
		ballPos.z += ball.$velocity.z;

		// add an arc to the ball's flight. Comment this out for boring, flat pong.
		ballPos.y = -((ballPos.z - 1) * (ballPos.z - 1) / 5000) + 435;
	}

	function isSideCollision() {
		let ballX = ball.position.x,
			halfFieldWidth = (FIELD_WIDTH - 2) / 2;
		return ballX - BALL_RADIUS < -halfFieldWidth || ballX + BALL_RADIUS > halfFieldWidth;
	}

	function hitBallBack(paddle) {
		ball.$velocity.x = (ball.position.x - paddle.position.x) / 9;
		ball.$velocity.z *= -1;
	}

	function isPaddle2Collision() {
		return ball.position.z - BALL_RADIUS <= paddle2.position.z &&
			isBallAlignedWithPaddle(paddle2);
	}

	function isPaddle1Collision() {
		return ball.position.z + BALL_RADIUS >= paddle1.position.z &&
			isBallAlignedWithPaddle(paddle1);
	}

	function isBallAlignedWithPaddle(paddle) {
		let halfPaddleWidth = PADDLE_WIDTH / 2,
			paddleX = paddle.position.x,
			ballX = ball.position.x;
		return ballX > paddleX - halfPaddleWidth &&
			ballX < paddleX + halfPaddleWidth;
	}

	function scoreBy(playerName) {
		addPoint(playerName);
		updateScoreBoard();
		stopBall();
		setTimeout(reset, 2000);
	}

	function updateScoreBoard() {
		const scoreBoard = $("#scoreBoard");
		if (scoreBoard) {
			scoreBoard.innerHTML = 'Player 1: ' + score.player1 + ' Player 2: ' +
				score.player2;
		}
	}

	function stopBall() {
		ball.$stopped = true;
	}

	function addPoint(playerName) {
		score[playerName]++;
		console.log(score);
	}

	function startRender() {
		running = true;
		render();
	}

	function stopRender() {
		running = false;
	}

	function reset() {
		ball.position.set(0, 0, 0);
		ball.$velocity = null;

		BALL_RADIUS = 20;
		ball.geometry.dispose();
		ball.geometry = new THREE.IcosahedronGeometry(BALL_RADIUS, 0);
		ball.material.emissive.setHex(0xFF9900);

		rotationSpeed = 0.02;
	}

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


	function containerMouseMove(e) {
		let mouseX = e.clientX;
		let halfPaddleWidth = PADDLE_WIDTH / 2;
		let maxX = FIELD_WIDTH / 2 - halfPaddleWidth;
		let minX = -maxX;
		camera.position.x = paddle1.position.x = Math.max(minX, Math.min(maxX, -((WIDTH - mouseX) / WIDTH * FIELD_WIDTH) + (FIELD_WIDTH / 2)));
	}

	//////////
	function handleMultipleKeys() {
		// 여러 키를 동시에 처리하는 로직 작성

		if (keyState.KeyA) {
			// A 키가 눌려 있을 때의 동작
			// paddle1과 camera를 이동시킴
			movePaddle1WithKeyboard(-1);
		} if (keyState.KeyD) {
			// D 키가 눌려 있을 때의 동작
			// paddle1과 camera를 이동시킴
			movePaddle1WithKeyboard(1);
		} if (keyState.ArrowLeft) {
			// 왼쪽 화살표가 눌려 있을 때의 동작
			// paddle2와 camera2를 이동시킴
			movePaddle2WithKeyboard(1);
		} if (keyState.ArrowRight) {
			// 오른쪽 화살표가 눌려 있을 때의 동작
			// paddle2와 camera2를 이동시킴
			movePaddle2WithKeyboard(-1);
		}

		// 다른 여러 키를 처리하는 로직 추가
	}

	/////////

	function handleKeyUp(event) {
		// 각 키의 상태를 떼어진 상태로 설정
		keyState[event.code] = false;

		// 여러 키를 동시에 처리하는 함수 호출
		handleMultipleKeys();
	}

	function handleKeyDown(event) {

		keyState[event.code] = true;
		handleMultipleKeys();

		const currentTime = new Date().getTime();
		if (currentTime - lastSpaceBarPressTime < 1000 && isSpaceBarPressed) {
			return;
		}
		if (event.code === 'KeyW' || event.code === 'ArrowUp') {
			if (shouldPerformAction(event.code) && !isSpaceBarPressed && !isPastPaddle1() && !isPastPaddle2()) {
				console.log("Critical!");
				blinkEffect();
				if (ball && ball.$velocity) {
					if (ball.$velocity.z < 0) {
						ball.$velocity.z -= 4;
					} else {
						ball.$velocity.z += 4;
					}
				}
				console.log(ball.$velocity.z);
				// 회전 속도증가
				rotationSpeed += 0.008; // TODO 로테이션스피드는 애니메이션에서 갱신적용해야함
				// 크기 증가
				if (BALL_RADIUS < 50) {
					BALL_RADIUS += 5;
				}
				updateBallSize();
				isSpaceBarPressed = true;

				// 현재 시간을 lastSpaceBarPressTime에 저장
				lastSpaceBarPressTime = currentTime;

				// 지연 시간 후에 isSpaceBarPressed를 false로 설정하여 다시 스페이스바 입력을 받을 수 있도록 함
				setTimeout(() => {
					isSpaceBarPressed = false;
				}, 500); // 적절한 지연 시간 설정 (예: 1초)
			}
		}
	}

	function movePaddle1WithKeyboard(direction) {
		// 키보드 입력에 따라 새로운 패들 위치 계산
		const newPaddleX = paddle1.position.x + direction * 30; // 필요에 따라 이동 속도 조절

		// 패들이 필드를 벗어나지 않도록 제한
		paddle1.position.x = Math.max(-FIELD_WIDTH / 2 + PADDLE_WIDTH / 2, Math.min(FIELD_WIDTH / 2 - PADDLE_WIDTH / 2, newPaddleX));

		// 카메라 위치 업데이트
		camera.position.x = paddle1.position.x;
	}
	function movePaddle2WithKeyboard(direction) {
		// 키보드 입력에 따라 새로운 패들 위치 계산
		const newPaddleX = paddle2.position.x + direction * 30; // 필요에 따라 이동 속도 조절

		// 패들이 필드를 벗어나지 않도록 제한
		paddle2.position.x = Math.max(-FIELD_WIDTH / 2 + PADDLE_WIDTH / 2, Math.min(FIELD_WIDTH / 2 - PADDLE_WIDTH / 2, newPaddleX));

		// 카메라 위치 업데이트
		camera2.position.x = paddle2.position.x;
	}



	function updateBallSize() {
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

		// console.log(initialEmissive);

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


	// 키 상태를 저장할 객체
	const keyState = {
		KeyA: false,  // A 키
		KeyD: false,  // D 키
		ArrowLeft: false,  // 왼쪽 화살표
		ArrowRight: false,  // 오른쪽 화살표
	};


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
		this.render();

		// Initialize Three.js
		initThreeJs(this.$element);

		// Start animation loop
		startAnimation();

		// Add event listeners or other initialization logic here
		initEventListeners();

		function initEventListeners() {
			document.addEventListener('keydown', handleKeyDown);
			document.addEventListener('keyup', handleKeyUp);
			renderer.domElement.addEventListener('mousemove', containerMouseMove);
		}
	};

	this.init();
}
//해보자 해보고 욕하자!!!
export default Example;

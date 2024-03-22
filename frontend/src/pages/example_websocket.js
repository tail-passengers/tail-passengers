import { $ } from "../utils/querySelector.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as THREE from "three";

function SocketTest({ $app, initialState }) {

	let socketList = [];

	const socket = io('ws://localhost:8005', {
		path: '/socket.io',
		transports: ['websocket'],
		query: {
			nickname: 'clientA',
		}
	});
	socketList.push(socket);

	socket.on('score', function (data) {
		score.player1 = parseInt(data.player1);
		score.player2 = parseInt(data.player2);
		// addPoint();
	});
	
	const socket2 = io('ws://localhost:8005', {
		path: '/socket.io',
		transports: ['websocket'],
		query: {
			nickname: 'clientB',
		}
	});
	socketList.push(socket2);
	console.log("socketList Length", socketList.length);

	let navBarHeight = $(".navigation-bar").clientHeight;
	let footerHeight = $(".tp-footer-container").clientHeight;

	let WIDTH = window.innerWidth,                                 //canvas.css에서 반응형으로 처리
		HEIGHT = window.innerHeight - (navBarHeight + footerHeight), //canvas.css에서 반응형으로 처리
		VIEW_ANGLE = 45,
		ASPECT = WIDTH / HEIGHT,
		NEAR = 0.1,
		FAR = 10000,
		FIELD_WIDTH = 1200,
		FIELD_LENGTH = 3000,
		BALL_RADIUS = 20,
		PADDLE_WIDTH = 200,
		PADDLE_HEIGHT = 30,

		// //get the scoreboard element.
		// scoreBoard = document.getElementById('scoreBoard'),

		//declare members.
		mainLight,
		ball, paddle1, paddle2, field, running,
		randomOffset = 0,
		rotationSpeed = 0.06,
		
		score = {
			player1: 0,
			player2: 0
		};

	// Declare variables for scene, camera, and renderer
	let scene, camera, renderer;


	let paddleCnt = 0;
	let wand1, wand2;
	const wandLoader1 = new GLTFLoader();
	const wandLoader2 = new GLTFLoader();

	// Declare variable for the cube mesh
	let cube;

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

			processBallMovement();
			if (ball.$velocity.z < 0) {
				processCpuPaddle();
			}

			renderer.render(scene, camera);
		}
	}

	function initThreeJs(contentDiv) {
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
		camera.position.set(0, 100, FIELD_LENGTH / 2 + 500);
		scene.add(camera); // 카메라 시점을 객체에 추가

		renderer = new THREE.WebGLRenderer();
		renderer.setSize(WIDTH, HEIGHT);
		renderer.setClearColor(0x9999BB, 1);
		renderer.domElement.classList.add("tp-th-canvas");
		if (contentDiv) {
			contentDiv.appendChild(renderer.domElement);
		}

		const scoreBoard = $("#scoreBoard");
		if (scoreBoard) {
			scoreBoard.classList.add("visually-hidden");
		}



		const geometry = new THREE.BoxGeometry(1, 1, 1); // 큐브용
		const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // 큐브 색상
		cube = new THREE.Mesh(geometry, material); // Assign value to the cube variable
		// scene.add(cube); // 큐브를 객체에 추가

		let fieldGeometry = new THREE.BoxGeometry(FIELD_WIDTH, 5, FIELD_LENGTH, 1, 1, 1),
		fieldMaterial = new THREE.MeshLambertMaterial({ color: 0xCDC5BD }); //color: 0x442200
		field = new THREE.Mesh(fieldGeometry, fieldMaterial);
		field.position.set(0, -50, 0);
		scene.add(field);

		const ballGeometry = new THREE.BoxGeometry(BALL_RADIUS, BALL_RADIUS, BALL_RADIUS);
		const ballMaterial = new THREE.MeshLambertMaterial({ color: 0xFF9900 });
		ball = new THREE.Mesh(ballGeometry, ballMaterial);
		scene.add(ball);

		// 패들 지오메트리 추가
		paddle1 = addPaddle();
		paddle1.position.z = FIELD_LENGTH / 2;
		paddle2 = addPaddle();
		paddle2.position.z = -FIELD_LENGTH / 2;

		/**
		 * 지팡이 3D 가져오기
		 */
		loadWanders(wandLoader1).then(() => loadWanders(wandLoader2));

		mainLight = new THREE.HemisphereLight(0xFFFFFF, 0xFF3333);
		scene.add(mainLight);

		// camera.lookAt(ball.position); // 왜 두번?

		updateScoreBoard();
		startRender();

		renderer.domElement.addEventListener('mousemove', containerMouseMove);

		renderer.domElement.style.cursor = 'none';
	}


	let ballTrail = [];
	// Animation function
	function animate() {
		requestAnimationFrame(animate);

		// Check if cube is defined
		if (ball) {
			ballTrail.push(ball.position.clone());

			// 제한된 효과 유지 (trail의 길이를 제한)
			if (ballTrail.length > 4) {
				ballTrail.shift();
			}
			ball.rotation.x += 0.06;
			ball.rotation.y += 0.06;

			renderer.render(scene, camera);
			// renderBallTrail();
		}
	}

	function renderBallTrail() {
		// Remove existing trail objects from the scene
		scene.children.forEach(child => {
			if (child instanceof THREE.Mesh && child.name === 'ballTrail') {
				scene.remove(child);
			}
		});

		// Render only the last five positions in ballTrail array
		for (let i = Math.max(0, ballTrail.length - 6); i < ballTrail.length; i++) {
			const trailGeometry = new THREE.IcosahedronGeometry(BALL_RADIUS - 4 * (4 / i), 0);
			const trailMaterial = new THREE.MeshLambertMaterial({ color: 0xFF9900, transparent: true, opacity: 0.1 + i / 10 });
			const trail = new THREE.Mesh(trailGeometry, trailMaterial);

			// 현재 위치에 렌더
			if (ballTrail[i]) {
				trail.position.copy(ballTrail[i]);
				trail.name = 'ballTrail'; // Set a name to identify trail objects
				scene.add(trail);
			}
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
      <!-- Add HTML content here -->
			<h3 id="scoreBoard"></h3>
			<div class="tp-sl-btn-parent default-container">
					<button type="submit" class="btn tp-btn-primary tp-sl-btn-primary tp-pf-btn tp-pf-exit-btn card default-container h-100" value="modify"> 
						<div class="card-body">
							<h5 class="tp-pf-card-title default-container">EXIT</h5>
						</div>
					</button>
			</div>
			<div class="socket-test-div tp-color-secondary"></div>
    `;
	};

	function startBallMovement() {
		let direction = Math.random() > 0.5 ? -1 : 1;
		ball.$velocity = {
			x: 0,
			z: direction * 20
		};
		ball.$stopped = false;
	}

	function processCpuPaddle() {
		let ballPos = ball.position,
			cpuPos = paddle2.position;

		// let randomOffset = Math.random() * 50 - 25; // -25에서 25 사이의 랜덤한 값
		if (cpuPos.x - 100 > ballPos.x) {
			cpuPos.x -= Math.min(cpuPos.x - ballPos.x + randomOffset, 20);
		} else if (cpuPos.x - 100 < ballPos.x) {
			cpuPos.x += Math.min(ballPos.x - cpuPos.x + randomOffset, 20);
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
			updateRandomOffset();
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
		randomOffset = Math.random() * 201 - 99;
		// CPU 패들의 위치에 랜덤값을 더하여 업데이트
		paddle2.position.x += randomOffset;
	}

	function isPastPaddle1() {
		return ball.position.z > paddle1.position.z + 100;
	}

	function isPastPaddle2() {
		return ball.position.z < paddle2.position.z - 100;
	}

	function updateBallPosition() {
		let ballPos = ball.position;

		//update the ball's position.
		ballPos.x += ball.$velocity.x;
		ballPos.z += ball.$velocity.z;

		// add an arc to the ball's flight. Comment this out for boring, flat pong.
		ballPos.y = -((ballPos.z - 1) * (ballPos.z - 1) / 5000) + 435;
	}

	function isSideCollision() {
		let ballX = ball.position.x,
			halfFieldWidth = FIELD_WIDTH / 2;
		return ballX - BALL_RADIUS < -halfFieldWidth || ballX + BALL_RADIUS > halfFieldWidth;
	}

	function hitBallBack(paddle) {
		ball.$velocity.x = (ball.position.x - paddle.position.x) / 5;
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
		setTimeout(reset, 1000);
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
		if (playerName === 'player1' || playerName === 'player2') {
			// score[playerName]++; TODO - 테스트 때문에 주석 처리, 추후 서버에 정보 전달 시 주석 해제 예정
			if (score[playerName] <= 0) {
				const data = { playerName: playerName, score: 0 };
				socket.send(JSON.stringify(data));
			}
			console.log(score);
		}
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

		// box mesh 크기 초기화
		ball.geometry.dispose();
		ball.geometry = new THREE.BoxGeometry(BALL_RADIUS, BALL_RADIUS, BALL_RADIUS);
	}

	function addPaddle() {
		let paddleGeometry = new THREE.BoxGeometry(PADDLE_WIDTH, PADDLE_HEIGHT, 10, 1, 1, 1),
			paddleMaterial = new THREE.MeshLambertMaterial({ color: 0xCCCCCC }),
			paddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
		scene.add(paddle);
		return paddle;
	}

	function loadWanders(wandLoader) {
		return new Promise((resolve, reject) => {
				wand1 = addWand(wandLoader);
				resolve();
			});
	}


	function addWand(wandLoader) {
		let wand;
		wandLoader.load(
			'http://127.0.0.1:5500/public/assets/gltf/wand/the_elder_wand.glb', 
			function(gltf) {
				wand = gltf.scene;
				if (paddleCnt === 0) {
					wand.position.set(0, 0, 0);
					wand.position.z = FIELD_LENGTH / 2;
					++paddleCnt;
				}
				else if (paddleCnt === 1) {
					wand.position.set(0, 0, 0);
					wand.position.z = -FIELD_LENGTH / 2;
					++paddleCnt;
				}
				wand.scale.set(15, 10, 10);
				scene.add(wand);
			}, 
			undefined,
			function (error) {
				console.error( error );
			} 
		);
		return wand;
	}

	function containerMouseMove(e) {
		let mouseX = e.clientX;
		camera.position.x = paddle1.position.x = -((WIDTH - mouseX) / WIDTH * FIELD_WIDTH) + (FIELD_WIDTH / 2);
	}


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

		/**
		 * Button Event
		 */
		const exitBtn = $(".tp-pf-exit-btn");
		exitBtn.addEventListener("click", (event) => {
			event.preventDefault();
			if (socketList.length > 0) {
				socketList.forEach((socket) => {
					socket.disconnect();
				});
			}
			socketList.pop();
			if (socketList.length === 0) {
				score.player1 = 0;
				score.player2 = 0;
				scoreBy();
			}
		});

		// Initialize Three.js
		initThreeJs(this.$element);

		// Start animation loop
		startAnimation();

		// Add event listeners or other initialization logic here
		initEventListeners();

		function initEventListeners() {
			// Event listener for mouse movement
			renderer.domElement.addEventListener('mousemove', containerMouseMove);

			// Event listener for space bar
			document.addEventListener('keydown', handleKeyDown);
		}
		function handleKeyDown(event) {
			// Check if the pressed key is the space bar (key code 32)
			if (event.code === 'Space') {
				// 속도 증가
				if (ball && ball.$velocity) {
					if (ball.$velocity.z < 0) {
						ball.$velocity.z -= 2;
					}
					ball.$velocity.z += 2;
				}
				// 회전 속도증가
				rotationSpeed += 0.1; //TODO 로테이션스피드는 애니메이션에서 갱신적용해야함
				// 크기 증가
				const newSize = {
					width: ball.geometry.parameters.width + 2,
					height: ball.geometry.parameters.height + 2,
					depth: ball.geometry.parameters.depth + 2
				};
				updateBallSize(newSize);
				console.log(ball.rotation.x);
			}
		}
		function updateBallSize(newSize) {
			// Create a new ball geometry with the updated size
			const newGeometry = new THREE.BoxGeometry(newSize.width, newSize.height, newSize.depth);

			// Update the geometry of the box mesh
			ball.geometry.dispose();
			ball.geometry = newGeometry;
		}
	};

	this.setSocket = () => {
		/**
		 * Websocket Test
		 */
		let log = function(s) {
			if (document.readyState !== "complete") {
				log.buffer.push(s);
			} else {
				const output = $(".socket-test-div");
				output.innerHTML += (s + "\n");
			}
		}
		log.buffer = [];

		socket.on('news', function (data) {
				socket.emit('reply', 'Hello Node.JS');
				console.log(data);
		});

		socket.on('message', function (data) {
			console.log(data);
		});

		socket.onopen = () => {
			log("open");
			socket.send("thank you for accepting this Web Socket request");
		}

		socket.onmessage = (event) => {
			log(event.data);
		}

		socket.onclose = () => {
			log("closed");
		}

		socket2.on('news', function (data) {
			socket2.emit('reply', 'Hello Client2');
			console.log(data);
		});

		socket2.on('message', function (data) {
			console.log(data);
		});

		socket2.onopen = () => {
			log("open");
			socket2.send("thank you for accepting this Web Socket2 request");
		}

		socket2.onmessage = (event) => {
			log(event.data);
		}

		socket2.onclose = () => {
			log("closed");
		}
	}

	this.setSocket();
	this.init();
}

export default SocketTest;

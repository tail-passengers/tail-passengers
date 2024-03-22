# Frontend (Seulee2 Jaekkang Yunjcho)

## Issue

<details>
	<summary>&emsp;<b>[해결]</b> Login Modal 생성 후, Modal을 닫아도 다른 네비게이션으로 이동할 수 없는 이슈</summary>
	<ul>
		<li>Nav의 메뉴 버튼 클릭 시 화면 전환이 안됨</li>
		<code>Uncaught DOMException: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.
 		</code></br>
		<code>index.html에서 컴포넌트의 순서에서 modal을 최하단을 내림으로 써 해결됨. 아직 팩트확인은 안했는데 뇌피셜로는 modal이 상단에 있는 상태에서 display: none; 옵션을 되어 버리면 다른 페이지를 이동하기전에 컴포넌트가 정상적으로 조회되지 않아서 생기는 문제인 것 같음</code>
	</ul>
</details>
<details>
	<summary>&emsp;<b>[해결]</b> Navigation, Routing 설정 중 화면 전환이 제대로 동작하지 않는 이슈</summary>
	<ul>
		<li>Nav의 메뉴 버튼 클릭 시 화면 전환이 안됨</li>
		<code>화면 전환에 사용되는 app component의 class name이 공통된 'content' 여야 새로운 정보로 작성해주는데 다른 이름으로 설정되어 있었음</code>
	</ul>
</details>
<details>
	<summary>&emsp;<b>[해결]</b> Three JS로 구현한 화면이 페이지 이동 후에도 계속 화면에 그려짐 </summary>
	<ul>
		<li>Three JS로 구현한 화면이 다른 페이지로 이동 후에도 계속 하단에 출력됨</li>
		<code>페이지 렌더링 시, canvas 태그가 있는 경우 삭제하고 화면을 렌더링 하도록 함(Three JS 화면 중복 생성 방지 및 다른 페이지 이동 시 캔버스가 렌더링 되지 않도록 함)</code>
	</ul>
</details>
<details>
	<summary>&emsp;<b>[해결]</b> Game Mode Selection 화면에서 브라우저 크기 조절 시 버튼 크기가 상이한 이슈</summary>
	<ul>
		<li>브라우저 화면을 축소하면 Single Mode 버튼 크기가 작아짐</li>
		<code>버튼 사이의 간격을 확보하기 위해 Single Mode의 button 태그에 준 margin을 삭제, 버튼 사이의 간격은 Gutters를 사용</code>
	</ul>
</details>
<details>
	<summary>&emsp;Axios로 localhost:8000의 200 ok 응답 받기가 안되는 이슈</summary>
	<ul>
		<li>기본적인 axios 사용 방법은 import Axios from "axios" 이지만, 실제 구동시 참조할수 없다는 에러가 발생</li>
		<code>"index.js"파일이 아닌 "index.html" 파일에 axios를 import하는 코드를 추가하여 의존성 주입을 실행</code>
	</ul>
</details>
<details>
	<summary>&emsp;<b>[해결]</b> Seulee2 작성 코드 중 class name으로 불러온 컴포넌트가 다른 페이지에 영향을 준 이슈</summary>
	<ul>
		<li>좀더 자세히는 불러온 component 중에서 메인, 혹은 다른 페이지에도 동일한 이름을 사용하는 클래스가 있어 페이지 전환 중에 변경된 css가 유지되는 이슈가 발생했습니다.</li>
		<code>이슈 처리 중...</code>
	</ul>
</details>

## Use Technical Stack

-   VanilaJS
-   Bootstrap
-   Three JS(for this module -> Use of advanced 3D techniques)
-   webpack / webpack cli
-   socket programing 을 이용한 멀티게임 구현

## To Do List 2 / 27 ~ (화요일)

-   [x] node.js로 Websocket 구현
-   [ ] Authentication / Authenticate (인증 / 인가) jwt
-   [ ] Research "Restful API"
-   [ ] three js multi game 구상 / 디자인 요소 설정 방법 research

## To Do History

<details>
	<summary>열어보기</summary>

-   [x] My Profile edit page 작성
-   [x] about us page 작성
-   [x] Pong game 프로젝트에 넣어놓기
-   [x] Docker webpack 설정
-   [x] My Profile page 작성
-   [x] Three JS page
-   [x] GameMode selection page
-   [x] Login page
-   [x] Connect the navigation
-   [x] Research & Add for SPA
-   [x] Axios (Http method 연결을 도와주는 라이브러리)
-   [x] create repository
-   [x] default setting our project
-   [x] view index.html
-   [x] check bootstrap doc
-   [x] (optional) add design system file (읽어보기)
-   [x] Connect Bootstrap
-   [x] View index.js
</details>

## VSC extension setting

-   innerHTML : 문법상 주석처럼 처리되는 부분의 html 문법도 체크해줌
-   Live Server : 코드 변경시 html 파일을 새로 열지 않아도 브라우저 상에 최신화 해줌

## Library

-   bootstrap : 이미 index.html 에서 import 문으로 주입을 해주었지만, node로도 사용이 가능하다고 하여 설치, 추후 중복은 삭제 예정
-   three : 3d content 사용을 위한 라이브러리 설치

## 참고 링크

-   [바닐라 js와 jQeury에 대한 의견](https://velog.io/@productuidev/jQuery-Vanilla)
-   [코드 및 디자인 스타일 참조](https://github.com/soonmac/vaccine_campaign?tab=readme-ov-file)
-   [Vanilla js로 간단 SPA구현하기](https://velog.io/@eunddodi/Vanilla-Javascript%EB%A1%9C-SPA-%EA%B5%AC%ED%98%84%ED%95%98%EA%B8%B0%ED%94%84%EB%A1%9C%EA%B7%B8%EB%9E%98%EB%A8%B8%EC%8A%A4-%EC%87%BC%ED%95%91%EB%AA%B0-SPA)
-   [SPA 특징 및 구현 방법](https://www.elancer.co.kr/blog/view?seq=214)
-   [Axios 사용법](https://inpa.tistory.com/entry/AXIOS-%F0%9F%93%9A-%EC%84%A4%EC%B9%98-%EC%82%AC%EC%9A%A9)
-   [Vanilla JS로 간단 Web Component를 작성하는 것에 대하여](https://junilhwang.github.io/TIL/Javascript/Design/Vanilla-JS-Component/#_5-%E1%84%8F%E1%85%A5%E1%86%B7%E1%84%91%E1%85%A9%E1%84%82%E1%85%A5%E1%86%AB%E1%84%90%E1%85%B3-%E1%84%87%E1%85%AE%E1%86%AB%E1%84%92%E1%85%A1%E1%86%AF)
-   [Webpack / 모듈 번들러란](https://velog.io/@huurray/%EC%9B%B9%ED%8C%A9-Webpack-%EC%9D%98-%EA%B0%9C%EB%85%90%EA%B3%BC-vanilla-js-boilerplate)
-   [Ajax / Axios 안쓰고 순수하게 내장함수로 구현하는 HTTP 통신 관련 글](https://kim-oriental.tistory.com/12)

-   [Three js object 공유 사이트](https://sketchfab.com/feed)
-   [Three js viewer](https://gltf-viewer.donmccurdy.com/)
-   [Node js & sock.io 를 이용한 멀티게임 간단 구현](https://god-gil.tistory.com/78)
-   [Node js 웹 소켓으로 실시간 데이터 전송하기](https://corner-ds.tistory.com/211)
-   [Multi Language 지원방법](https://medium.com/@nohanabil/building-a-multilingual-static-website-a-step-by-step-guide-7af238cc8505)

## How To run?

-   1: git clone
-   2: npm install
-   3: npm start

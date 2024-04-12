import Game from "../pages/game.js";
import Home from "../pages/home.js";
import NotFound from "../pages/notFound.js";
import SelectMode from "../pages/selectMode.js";
import Rank from "../pages/rank.js";
import Profile from "../pages/profile.js";
import SocketTest from "../pages/example_websocket.js";
import Tornament from "../pages/tornament.js";
import GameResult from "../pages/result.js";

export const routes = [
	{ path: /^\/$/, element: Home },
	{ path: /^\/game$/, element: Game },
	{ path: /^\/rank$/, element: Rank },
	{ path: /^\/selectmode$/, element: SelectMode },
	{ path: /^\/profile$/, element: Profile },
	{ path: /^\/general_game\/(.+)$/, element: SocketTest },
	{ path: /^\/tornament$/, element: Tornament },
	{ path: /^\/result$/, element: GameResult },
	{ path: /.*/, element: NotFound },
];

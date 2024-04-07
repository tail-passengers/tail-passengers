import Game from "../pages/game.js";
import Home from "../pages/home.js";
import NotFound from "../pages/notFound.js";
import SelectMode from "../pages/selectMode.js";
import Rank from "../pages/rank.js";
import Profile from "../pages/profile.js";
import AboutUs from "../pages/aboutus.js";
import SocketTest from "../pages/example_websocket.js";
import RecordsSearch from "../pages/recordsSearch.js";
import Tornament from "../pages/tornament.js";

export const routes = [
	{ path: /^\/$/, element: Home },
	{ path: /^\/game$/, element: Game },
	{ path: /^\/rank$/, element: Rank },
	{ path: /^\/records$/, element: RecordsSearch },
	{ path: /^\/aboutus$/, element: AboutUs },
	{ path: /^\/selectmode$/, element: SelectMode },
	{ path: /^\/profile$/, element: Profile },
	{ path: /^\/general_game\/(.+)$/, element: SocketTest },
	{ path: /^\/tornament$/, element: Tornament },
	{ path: /.*/, element: NotFound },
];

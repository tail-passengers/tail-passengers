import Game from "../pages/game.js";
import Home from "../pages/home.js";
import NotFound from "../pages/notFound.js";
import SelectMode from "../pages/selectMode.js";
import Rank from "../pages/rank.js";
import Profile from "../pages/profile.js";
import General from "../pages/general.js";
import RecordsSearch from "../pages/recordsSearch.js";
import Tournament from "../pages/tournament.js";
import GameResult from "../pages/result.js";
import Loading from "../pages/gameLoading.js";
import Dashboard from "../pages/dashboard.js";

export const routes = [
    { path: /^\/$/, element: Home },
    { path: /^\/game$/, element: Game },
    { path: /^\/rank$/, element: Rank },
    { path: /^\/dashboard$/, element: Dashboard },
    { path: /^\/records$/, element: RecordsSearch },
    { path: /^\/selectmode$/, element: SelectMode },
    { path: /^\/profile$/, element: Profile },
    { path: /^\/loading$/, element: Loading },
    { path: /^\/general_game\/(.+)$/, element: General },
    { path: /^\/tournament_game\/(.+)$/, element: General },
    { path: /^\/tournament$/, element: Tournament },
    { path: /^\/result\/(.+)$/, element: GameResult },
    { path: /.*/, element: NotFound },
];

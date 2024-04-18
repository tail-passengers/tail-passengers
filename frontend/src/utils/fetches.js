import { deleteCSRFToken, getCSRFToken } from "./cookie.js";
import { navigate } from "./navigate.js";
import { deleteIntervalId } from "./profileEventListener.js";

/**
 *
 * @returns 나의 intraId
 */
export const fetchMyIntraId = async () => {
    try {
        const response = await fetch(
            `https://${process.env.BASE_IP}/api/v1/me/`,
            {
                credentials: "include",
            }
        );

        const data = await response.json();
        return data[0].intra_id;
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
};

/**
 *
 * @returns 나의 회원 정보
 */
export const fetchUser = async () => {
    try {
        const response = await fetch(
            `https://${process.env.BASE_IP}/api/v1/me/`,
            {
                credentials: "include",
            }
        );

        if (response.status === 200) {
            const data = await response.json();
            return data;
        } else {
            deleteCSRFToken();
            navigate("/");
            window.location.reload();
        }
    } catch (error) {
        deleteCSRFToken();
        navigate("/");
        window.location.reload();
        return false;
    }
};

/**
 *
 * @returns 모든 유저들의 랭킹 정보
 */
export const fetchUsers = async () => {
    try {
        const response = await fetch(
            `https://${process.env.BASE_IP}/api/v1/users/`,
            {
                credentials: "include",
            }
        );
        const data = await response.json();
				data.sort((a, b) => {
						return (b.win_count - b.lose_count) - (a.win_count - a.lose_count);
				});
				return data;
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
};

/**
 *
 * @param {*} myData : 내 회원 정보
 * @returns : DB에 저장된 내 회원 정보
 */
export const fetchModifyMyInfoRequest = async (myData) => {
    try {
        const csrfToken = getCSRFToken();
        const myIntraId = await fetchMyIntraId();
        const response = await fetch(
            `https://${process.env.BASE_IP}/api/v1/users/` + myIntraId + "/",
            {
                method: "PATCH",
                headers: {
                    "X-CSRFToken": csrfToken,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    nickname: myData.get("nickname"),
                    house: myData.get("house"),
                }),
                referrerPolicy: "origin",
            }
        );
        if (response.status === 400) {
            alert("duplicate nickname")
            return;
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetchModifyMyInfoRequest data:", error);
    }
};

/**
 *
 * @param {*} imageData 이미지 파일명과 실제 이미지 리소스가 담긴 FormData 객체
 * @returns 수정된 유저 정보
 */
export const fetchImageFileRequest = async (imageData) => {
    try {
        const csrfToken = getCSRFToken();
        const myIntraId = await fetchMyIntraId();
        const response = await fetch(
            `https://${process.env.BASE_IP}/api/v1/users/` + myIntraId + "/",
            {
                method: "PATCH",
                headers: {
                    "X-CSRFToken": csrfToken,
                },
                body: imageData,
                referrerPolicy: "origin",
            }
        );

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetchImageFileRequest data:", error);
    }
};

/**
 *
 * @returns DB에 저장된 내 회원 정보
 */
export const fetchLogoutRequest = async () => {
    try {
        const response = await fetch(
            `https://${process.env.BASE_IP}/api/v1/logout/`,
            {
                method: "GET",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        if (response.status === 200) {
            navigate("/");
            deleteCSRFToken();
            window.location.reload();
        }
    } catch (error) {
        console.error("Error fetchLogoutRequest:", error);
    }
};

/**
 *
 * @param {*} intraId 나의 intraID
 * @returns 나 -> 타인 / 타인 -> 나 사이에 발생한 모든 친구 요청 목록의 Array
 */
export const fetchAllFriends = async (intraId) => {
    try {
        const response = await fetch(
            `https://${process.env.BASE_IP}/api/v1/friend_requests/` +
                intraId +
                "/all/",
            {
                credentials: "include",
            }
        );
				if (response.ok) {
					const data = await response.json();
					data.sort((a, b) => {
							if (a.friend_status !== b.friend_status) {
									return a.friend_status - b.friend_status;
							} else {
									return b.status - a.status;
							}
					});
					return data;
				} else if (response.status === 403) {
					deleteCSRFToken();
					deleteIntervalId();
					navigate("/");
					return;
				}
    } catch (error) {
        console.error("Error fetchAllFriends data:", error);
    }
};

/**
 *
 * @param {*} intraId 나의 intraID
 * @returns 나 -> 타인 / 타인 -> 나 사이에 발생한 친구 요청 목록 중 상태가 accepted 인 것들의 Array
 */
export const fetchAcceptedFriends = async (intraId) => {
    try {
        const response = await fetch(
            `https://${process.env.BASE_IP}/api/v1/friend_requests/` +
                intraId +
                "/accepted/",
            {
                credentials: "include",
            }
        );

        const data = await response.json();
        data.sort((a, b) => {
            if (a.friend_status !== b.friend_status) {
                return a.friend_status - b.friend_status;
            } else {
                return b.status - a.status;
            }
        });
        return data;
    } catch (error) {
        console.error("Error fetchAcceptedFriends data:", error);
    }
};

/**
 *
 * @param {*} requestUserId 친구 요청 발신자
 * @param {*} responseUserId 친구 요청 수신자
 * @returns 친구 요청 테이블에 생성된 튜플의 PK
 */
export const fetchRequestFriend = async (requestUserId, responseUserId) => {
    try {
        const csrfToken = getCSRFToken();
        const response = await fetch(
            `https://${process.env.BASE_IP}/api/v1/friend_requests/`,
            {
                method: "POST",
                headers: {
                    "X-CSRFToken": csrfToken,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    request_user_id: requestUserId.trim(),
                    response_user_id: responseUserId.trim(),
                }),
            }
        );
        if (response.ok) {
            const data = await response.json();
            return data;
        } else if (response.status == 400) {
            alert("This user is already a friend or requested friend");
        }
        return null;
    } catch (error) {
        console.error("Error fetchRequestFriend data:", error);
    }
};

/**
 *
 * @param {*} requestPK 친구 요청 테이블에 생성된 튜플의 PK
 * @param {*} responseUserId 친구 요청 수신자(수신자만 accepted 처리가 가능)
 */
export const fetchAcceptFriendRequest = async (requestPK, responseUserId) => {
    try {
        const csrfToken = getCSRFToken();
        const response = await fetch(
            `https://${process.env.BASE_IP}/api/v1/friend_requests/` +
                requestPK +
                "/",
            {
                method: "PATCH",
                headers: {
                    "X-CSRFToken": csrfToken,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    request_user_id: responseUserId,
                    status: "1",
                }),
            }
        );
        const data = await response.json();
    } catch (error) {
        console.error("Error fetchAcceptFriendRequest data:", error);
    }
};

/**
 *
 * @param {*} requestPK 친구 요청 테이블에 생성된 튜플의 PK
 */
export const fetchRefuseFriendRequest = async (requestPK) => {
    try {
        const csrfToken = getCSRFToken();
        const response = await fetch(
            `https://${process.env.BASE_IP}/api/v1/friend_requests/` +
                requestPK +
                "/",
            {
                method: "DELETE",
                headers: {
                    "X-CSRFToken": csrfToken,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    request_id: requestPK,
                }),
            }
        );
        if (!response.ok) {
            return data;
        }
    } catch (error) {
        console.log("Error fetchRefuseFriendRequest data:", error);
    }
};

// fetches.js

/**
 *
 * @returns 차트 데이터
 */
export const fetchChartData = async () => {
    try {
        const response = await fetch(
            `https://${process.env.BASE_IP}/api/v1/chart/`,
            {
                credentials: "include",
            }
        );

        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            console.error("Error fetching chart data: ", response.statusText);
            return {};
        }
    } catch (error) {
        console.error("Error fetching chart data:", error);
        return {};
    }
};

export const fetchGameLogs = async () => {
    try {
        const response1 = await fetch(
            `https://${process.env.BASE_IP}/api/v1/general_game_logs/me/`
        );
        const response2 = await fetch(
            `https://${process.env.BASE_IP}/api/v1/tournament_game_logs/me/`
        );

        let data1 = [];
        let data2 = [];

        if (response1.ok) {
            data1 = await response1.json();
        }
        if (response2.ok) {
            data2 = await response2.json();
        }

        const combinedData = [...data1, ...data2];

        combinedData.sort(
            (a, b) => new Date(b.start_time) - new Date(a.start_time)
        );

        return combinedData;
    } catch (error) {
        console.error("Error fetching game logs:", error);
        return [];
    }
};

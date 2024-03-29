import { navigate } from "./navigate.js";

/**
 * 
 * @returns 나의 intraId
 */
export const fetchMyIntraId = async () => {
	try {
			const response = await fetch("https://localhost/api/v1/me/", {
				credentials: 'include'
			});

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
			const response = await fetch("https://localhost/api/v1/me/", {
				credentials: 'include'
			});

			const data = await response.json();
			return data;
	} catch (error) {
			console.error("Error fetching user data:", error);
	}
};


/**
 * 
 * @returns 모든 유저들의 랭킹 정보
 */
export const fetchUsers = async () => {
	try {
			const response = await fetch("https://localhost/api/v1/users/", {
					credentials: 'include'
			});
			const data = await response.json();
			data.sort(
					(a, b) =>
							b.win_count - b.lose_count < a.win_count - a.lose_count
			);
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
		const response = await fetch("https://localhost/api/v1/users/" + myData.intraId + "/", {
			method: "PATCH",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				nickname: myData.nickname,
				profile_image: myData.profileImage,
				coalitions: myData.coalitions,
			}),
		});
		
		const data = await response.json();
		return data;
	} catch (error) {
			console.error("Error fetching friends data:", error);
	}
}


/**
 * 
 * @returns DB에 저장된 내 회원 정보
 */
export const fetchLogoutRequest = async() => {
	try {
		const myIntraId = await fetchMyIntraId();
		const response = await fetch("https://localhost/api/v1/users/" + myIntraId + "/", {
			method: "PATCH",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
					status: 0,
			}),
		});

		const data = await response.json();
		console.log("fetchLogoutRequest() data", data);
		navigate("/");
		return data;
	} catch (error) {
			console.error("Error fetching friends data:", error);
	}
}

/**
 * 
 * @param {*} intraId 나의 intraID
 * @returns 나 -> 타인 / 타인 -> 나 사이에 발생한 모든 친구 요청 목록의 Array
 */
export const fetchAllFriends = async(intraId) => {
	try {
		const response = await fetch("https://localhost/api/v1/friend_requests/" + intraId + "/all/", {
			credentials: 'include'
		});
		
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
			console.error("Error fetching friends data:", error);
	}
};


/**
 * 
 * @param {*} intraId 나의 intraID
 * @returns 나 -> 타인 / 타인 -> 나 사이에 발생한 친구 요청 목록 중 상태가 accepted 인 것들의 Array
 */
export const fetchAcceptedFriends = async(intraId) => {
	try {
		const response = await fetch("https://localhost/api/v1/friend_requests/" + intraId + "/accepted/", {
			credentials: 'include'
		});
		
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
			console.error("Error fetching friends data:", error);
	}
};


/**
 * 
 * @param {*} requestUserId 친구 요청 발신자
 * @param {*} responseUserId 친구 요청 수신자
 * @returns 친구 요청 테이블에 생성된 튜플의 PK
 */
export const fetchRequestFriend = async(requestUserId, responseUserId) => {
	try {
		const response = await fetch("https://localhost/api/v1/friend_requests/", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					"request_user_id": requestUserId,
					"reponse_user_id": responseUserId,
				}),
		});

		const data = await response.json();
		console.log("fetchRefuseFriendRequest()", data);
		return data;
	} catch (error) {
			console.error("Error fetching friends data:", error);
	}
}


/**
 * 
 * @param {*} requestPK 친구 요청 테이블에 생성된 튜플의 PK
 * @param {*} responseUserId 친구 요청 수신자(수신자만 accepted 처리가 가능)
 */
export const fetchAcceptFriendRequest = async(requestPK, responseUserId) => {
	try {
		const response = await fetch("https://localhost/api/v1/friend_requests/" + requestPK + "/", {
				method: "PATCH",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					request_user_id: responseUserId,
					status: "1",
				}),
		});
		const data = await response.json();
	} catch (error) {
			console.error("Error fetching friends data:", error);
	}
}


/**
 * 
 * @param {*} requestPK 친구 요청 테이블에 생성된 튜플의 PK
 */
export const fetchRefuseFriendRequest = async(requestPK) => {
	try {
		const response = await fetch("https://localhost/api/v1/friend_requests/" + requestPK + "/", {
				method: "DELETE",
				credentials: "include",
		});
		const data = await response.json();
		return data;
	} catch (error) {
			console.error("Error fetching friends data:", error);
	}
}
export const fetchAcceptFriendRequest = async(requestPK) => {
	try {
		//TODO - friendList 수정 후 아래 코드 복원
		// const response = await fetch("http://127.0.0.1:8000/friend_requests/" + requestPK);
		//TODO - friendList 수정 후 아래 코드 제거
		const response = await fetch("https://localhost/users/");
		const data = await response.json();
		console.log("fetchAcceptFriendRequest()", data[1]);
	} catch (error) {
			console.error("Error fetching friends data:", error);
	}
}

export const fetchRefuseFriendRequest = async(requestPK) => {
	try {
		//TODO - friendList 수정 후 아래 코드 복원
		// const response = await fetch("http://127.0.0.1:8000/friend_requests/" + requestPK);
		//TODO - friendList 수정 후 아래 코드 제거
		const response = await fetch("https://localhost/users/");
		const data = await response.json();
		console.log("fetchRefuseFriendRequest()", data[1]);
	} catch (error) {
			console.error("Error fetching friends data:", error);
	}
}
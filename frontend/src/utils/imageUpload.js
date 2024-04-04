function convertImageToBlob(imageUrl) {
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	const img = new Image();

	img.onload = function () {
			canvas.width = img.width;
			canvas.height = img.height;
			ctx.drawImage(img, 0, 0);

			canvas.toBlob((blob) => {
					return blob;
			});
	};

	img.onerror = function (error) {
			console.log("[Error] convertImageToBlob()");
			return null;
	};

	img.src = imageUrl;
}

export function setImageToInput(imageUrl, inputElement) {
	const blob = convertImageToBlob(imageUrl);
	if (blob !== null) {
		const originImageFileName = imageUrl.split("/").pop();
		const file = new File([blob], originImageFileName, { type: 'image/jpeg' });
		const fileList = new DataTransfer();
		fileList.items.add(file);
		inputElement.files = fileList.files;
	}
}
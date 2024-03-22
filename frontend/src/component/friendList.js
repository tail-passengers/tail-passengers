export default function renderFriendList() {
	return `
	<form class="tp-pf-form-friends tp-sl-card-row tp-pf-card-row-height default-container row g-2">
		<table class="table table-dark table-hover">
			<thead>
				<tr class="tp-table-tr">
					<th scope="tp-table-th col">NO</th>
					<th scope="tp-table-th col">PROFILE</th>
					<th scope="tp-table-th col">NICKNAME</th>
					<th scope="tp-table-th col">CONNECTION</th>
					<th scope="tp-table-th col">FRIEND REQUEST</th>
				</tr>
			</thead>
			<tbody></tbody>
		</table>
	</form>
	`;
}
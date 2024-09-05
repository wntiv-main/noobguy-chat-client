function _NeedlemanWunsch(A, B, eq) {
	let d = 1;
	let sd = 1;
	const F = [];
	for(let i = 0; i < B.length + 1; i++) {
		F.push(new Array(A.length + 1));
	}
	for(let i = 0; i < A.length + 1; i++) {
		F[0][i] = d * i;
	}
	for(let j = 0; j < B.length + 1; j++) {
		F[j][0] = d * j;
	}
	for(let i = 0; i < A.length; i++) {
		for(let j = 0; j < B.length; j++) {
			const Match = F[j][i] + sd * (!eq(A[i], B[j]) ? 1 : 0);
			const Delete = F[j + 1][i] + d;
			const Insert = F[j][i + 1] + d;
			F[j + 1][i + 1] = Math.min(Match, Insert, Delete);
		}
	}
	const AlignmentA = [];
	const AlignmentB = [];
	let i = A.length;
	let j = B.length;
	while(i > 0 || j > 0) {
		if(i > 0 && j > 0 && F[j][i] == F[j - 1][i - 1] + sd * (!eq(A[i - 1], B[j - 1]) ? 1 : 0)) {
			AlignmentA.push(A[i - 1]);
			AlignmentB.push(B[j - 1]);
			i -= 1;
			j -= 1;
		} else if(i > 0 && F[j][i] == F[j][i - 1] + d) {
			AlignmentA.push(A[i - 1]);
			AlignmentB.push(null);
			i -= 1;
		} else {
			AlignmentA.push(null);
			AlignmentB.push(B[j - 1]);
			j -= 1;
		}
	}
	return [AlignmentA.reverse(), AlignmentB.reverse()];
}

function* range(start, end = undefined, step = 1) {
	if(end === undefined) {
		end = start;
		start = 0;
	}
	for(let i = start; (step > 0 ? (i < end) : (i > end)); i += step) {
		yield i;
	}
}

function _NWScore(X, Y, eq) {
	let Score0 = [...range(Y.length)];
	const Score1 = new Array(Y.length + 1);
	for(const Xi of X) {
		Score1[0] = Score0[0] + 1; // Del(Xi)
		for(let j = 0; j < Y.length; j++) {
			const scoreSub = Score0[j] + (!eq(Xi, Y[j]) ? 1 : 0); // Sub(Xi, Yj)
			const scoreDel = Score0[j + 1] + 1; // Del(Xi);
			const scoreIns = Score1[j] + 1; // Ins(Yj);
			Score1[j + 1] = Math.min(scoreSub, scoreDel, scoreIns);
		}
		// Copy Score[1] to Score[0];
		Score0 = [...Score1];
	}
	return Score0;
}

// https://en.wikipedia.org/wiki/Hirschberg%27s_algorithm
function _Hirschberg(X, Y, _equal = (a, b) => a == b) {
	let Z = [];
	let W = [];
	if(X.length == 0) {
		for(let Yi of Y) {
			Z.push(null);
			W.push(Yi);
		}
	} else if(Y.length == 0) {
		for(let Xi of X) {
			Z.push(Xi);
			W.push(null);
		}
	} else if(X.length == 1 || Y.length == 1) {
		const [z, w] = _NeedlemanWunsch(X, Y, _equal);
		Z = z;
		W = w;
	} else {
		const xmid = Math.floor(X.length / 2);
		const ScoreL = _NWScore(X.slice(0, xmid), Y, _equal);
		const ScoreR = _NWScore(X.slice(xmid).reverse(), [...Y].reverse(), _equal).reverse();
		let ymid = 0;
		let ymid_val = 9e99;
		for(let i = 0; i < Math.min(ScoreL.length, ScoreR.length); i++) {
			if(ScoreL[i] + ScoreR[i] < ymid_val) {
				ymid_val = ScoreL[i] + ScoreR[i];
				ymid = i;
			}
		}
		let [left_z, left_w] = _Hirschberg(X.slice(0, xmid), Y.slice(0, ymid));
		let [right_z, right_w] = _Hirschberg(X.slice(xmid), Y.slice(ymid));
		Z = left_z.concat(right_z);
		W = left_w.concat(right_w);
	}
	return [Z, W];
}

const parser = new DOMParser();
let messageContainer = document.querySelector('.board');
function _msgNodesEqual(a, b) {
	return a.querySelector(":scope > .OPAL-message-content").innerHTML == b.querySelector(":scope > .OPAL-message-content").innerHTML;
}

function handleHydratedResponse(updatedDOM, mimeType, newNodes) {
	const dom = parser.parseFromString(updatedDOM, mimeType);
	const newMsgContainer = dom.querySelector('.board');
	if(!newMsgContainer) return;
	const oldMsgs = [...messageContainer.querySelectorAll(":scope > .message:has(> .OPAL-message-content)")];
	const newMsgs = [...newMsgContainer.querySelectorAll(":scope > .message:has(> .OPAL-message-content)")];
	const [oldDiff, newDiff] = _Hirschberg(oldMsgs, newMsgs, _msgNodesEqual);
	for(let i = 0; i < oldDiff.length; i++) {
		if(newDiff[i] == null) {
			if(newNodes.includes(oldDiff[i])) {
				oldDiff[i].classList.remove("OPAL-message-sending");
				oldDiff[i].classList.add("OPAL-message-error");
				autoID--;
			} else {
				oldDiff[i].remove();
			}
		} else if(oldDiff[i] == null) {
			const newNode = document.importNode(newDiff[i], true);
			if(i < oldMsgs.length) {
				messageContainer.insertBefore(newNode, oldMsgs[i]);
				oldMsgs.splice(i, 0, newNode);
			} else {
				messageContainer.append(newNode);
				oldMsgs.push(newNode);
			}
		} else if(!_msgNodesEqual(oldDiff[i], newDiff[i])) {
			const newNode = document.importNode(newDiff[i], true);
			oldDiff[i].replaceWith(newNode);
		} else if(newNodes.includes(oldDiff[i])) oldDiff[i].classList.remove("OPAL-message-sending");
	}
}

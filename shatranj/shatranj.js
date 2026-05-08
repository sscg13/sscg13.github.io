let piece_images = ["Images/_King.png","Images/_Rook.png","Images/_Knight.png","Images/_Queen.png","Images/_Bishop.png","Images/_Pawn.png","","Images/Pawn.png","Images/Bishop.png","Images/Queen.png","Images/Knight.png","Images/Rook.png","Images/King.png"]
let attack_n = [];
let attack_e = [];
let attack_s = [];
let attack_w = [];
for (let i = 1; i < 8; i++) {
    attack_n.push([0, i]);
    attack_e.push([i, 0]);
    attack_s.push([0, -i]);
    attack_w.push([-i, 0]);
}
let attack_sliders = [];
attack_sliders.push([[[-1, 1]], [[1, 1]]]);
attack_sliders.push([[[2, 2]], [[2, -2]], [[-2, -2]], [[-2, 2]]]);
attack_sliders.push([[[1, 1]], [[1, -1]], [[-1, -1]], [[-1, 1]]]);
attack_sliders.push([[[-2, 1]], [[-1, 2]], [[1, 2]], [[2, 1]], [[2, -1]], [[1, -2]], [[-1, -2]], [[-2, -1]]]);
attack_sliders.push([attack_n, attack_e, attack_s, attack_w]);
attack_sliders.push([[[-1, 1]], [[0, 1]], [[1, 1]], [[1, 0]], [[1, -1]], [[0, -1]], [[-1, -1]], [[-1, 0]]]);
let positions = null;
let moves = null;
let ply = 0;
let whiteloss = 0;
let whiteloss1 = 0;
let whitemoves = 0;
let blackloss = 0;
let blackloss1 = 0;
let blackmoves = 0;
function compare(string1, string2) {
    for (let i = 0; i < Math.min(string1.length, string2.length); i++) {
        if (string1.charCodeAt(i) < string2.charCodeAt(i)) {
            return -1;
        }
        if (string1.charCodeAt(i) > string2.charCodeAt(i)) {
            return 1;
        }
    }
    return 0;
}
function get_analysis(ply, move, positions) {
    let entry = positions[ply]?.[move];
    if (!entry || entry.wdl == null) return null;
    let wdl = entry.wdl;
    return [entry.eval ?? 0, wdl[0], wdl[1], wdl[2]];
}
class Board {
    constructor() {
        this.board = [];
        this.color = 0;
        for (let i = 0; i < 8; i++) {
            this.board.push([0, 0, 0, 0, 0, 0, 0, 0]);
        }
    }
    set_starting_position() {
        this.color = 1;
        let home_row = [5, 4, 2, 6, 3, 2, 4, 5];
        for (let i = 0; i < 8; i++) {
            this.board[i][1] = 1;
            this.board[i][6] = -1;
            this.board[i][0] = home_row[i];
            this.board[i][7] = -home_row[i];
            for (let j = 2; j < 6; j++) {
                this.board[i][j] = 0;
            }
        }
    }
    is_blocked(x_coord, y_coord, color) {
        if (x_coord < 0 || x_coord > 7 || y_coord < 0 || y_coord > 7) {
            return true;
        }
        else {
            return (this.board[x_coord][y_coord]*color > 0);
        }
    }
    get_algebraic(x_coord, y_coord) {
        let files = ["a", "b", "c", "d", "e", "f", "g", "h"]
        let ranks = ["1", "2", "3", "4", "5", "6", "7", "8"]
        return files[x_coord]+ranks[y_coord]
    }
    get_all_moves(x_coord, y_coord) {
        let valid_locations = [];
        if (this.board[x_coord][y_coord] == 0) {
            return valid_locations;
        }
        else {
            let piece = this.board[x_coord][y_coord];
            let color = Math.sign(piece);
            let num_attacks = attack_sliders[Math.abs(piece)-1].length;
            for (let i = 0; i < num_attacks; i++) {
                let attacks = attack_sliders[Math.abs(piece)-1][i];
                let attack_length = attacks.length;
                for (let j = 0; j < attack_length; j++) {
                    let attack = attacks[j]
                    let x_new = x_coord+attack[0];
                    let y_new = y_coord+attack[1]*color;
                    if (this.is_blocked(x_new, y_new, color)) {
                        break;
                    }
                    else if (Math.abs(piece) > 1) {
                        valid_locations.push([x_new, y_new]);
                    }
                    else if (Math.sign(this.board[x_new][y_new])+color == 0) {
                        valid_locations.push([x_new, y_new]);
                    }
                    if (this.is_blocked(x_new, y_new, -color)) {
                        break;
                    }
                }
            }  
            if (Math.abs(piece) == 1) {
                if (this.board[x_coord][y_coord+color] == 0) {
                    valid_locations.push([x_coord, y_coord+color]);
                }
            }
        } 
        return valid_locations;
    }
    make_move(move) {
        let start_file = move.charCodeAt(0)-97;
        let start_rank = move.charCodeAt(1)-49;
        let end_file = move.charCodeAt(2)-97;
        let end_rank = move.charCodeAt(3)-49;
        let start_piece = this.board[start_file][start_rank];
        let taken_piece = this.board[end_file][end_rank];
        let color = Math.sign(start_piece);
        let end_piece = start_piece;
        if (move.length > 4) {
            end_piece = color*3;
        }
        this.board[end_file][end_rank] = end_piece;
        this.board[start_file][start_rank] = 0;
        this.color = -this.color;
        return [start_piece, taken_piece];
    }
    unmake_move(move, start_piece, end_piece) {
        let start_file = move.charCodeAt(0)-97;
        let start_rank = move.charCodeAt(1)-49;
        let end_file = move.charCodeAt(2)-97;
        let end_rank = move.charCodeAt(3)-49;
        this.board[start_file][start_rank] = start_piece;
        this.board[end_file][end_rank] = end_piece;
        this.color = -this.color;
    }
    king_location(color) {
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (this.board[i][j] == 6*color) {
                    return [i, j];
                }
            }
        }
        return [-1, -1];
    }
    king_attacked(color) {
        let x_coord = this.king_location(color)[0];
        let y_coord = this.king_location(color)[1];
        for (let i = 0; i < 6; i++) {
            let num_attacks = attack_sliders[i].length;
            for (let j = 0; j < num_attacks; j++) {
                let attacks = attack_sliders[i][j];
                let attack_length = attacks.length;
                for (let k = 0; k < attack_length; k++) {
                    let attack = attacks[k];
                    let x_new = x_coord+attack[0];
                    let y_new = y_coord+attack[1]*color;
                    if (this.is_blocked(x_new, y_new, color)) {
                        break;
                    }
                    else if (this.board[x_new][y_new]+(i+1)*color == 0) {
                        return true;
                    }
                    if (this.is_blocked(x_new, y_new, -color)) {
                        break;
                    }
                }
            }
        }
        return false;
    }
    pseudolegal_moves(color) {
        let all_moves = [];
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (this.board[i][j]*color > 0) {
                    let moves = this.get_all_moves(i, j);
                    let num_moves = moves.length;
                    for (let k = 0; k < num_moves; k++) {
                        let move = moves[k];
                        let promotion = "";
                        if (Math.abs(this.board[i][j]) == 1 && (move[1] == 0 || move[1] == 7)) {
                            promotion = "q";
                        }
                        all_moves.push(this.get_algebraic(i, j) + this.get_algebraic(move[0], move[1]) + promotion);
                    }
                }
            }
        }
        return all_moves;
    }
    is_valid_move(move) {
        let pseudo_moves = this.pseudolegal_moves(this.color);
        for (let i = 0; i < pseudo_moves.length; i++) {
            if (pseudo_moves[i] == move) {
                let pieces = this.make_move(pseudo_moves[i]);
                if (!this.king_attacked(-this.color)) {
                    this.unmake_move(pseudo_moves[i], pieces[0], pieces[1]);
                    return true;
                }
                this.unmake_move(pseudo_moves[i], pieces[0], pieces[1]);
            }
        }
        return false;
    }
    perft(color, depth, initialdepth) {
        if (depth == 0) {
            return 1;
        }
        let total_count = 0;
        let pseudo_moves = this.pseudolegal_moves(color);
        let move_count = pseudo_moves.length;
        for (let i = 0; i < move_count; i++) {
            let pieces = this.make_move(pseudo_moves[i]);
            if (!this.king_attacked(color)) {
                let sub_count = this.perft(-color, depth-1, initialdepth);
                if (depth == initialdepth) {
                    console.log(pseudo_moves[i] + " " + sub_count);
                }
                total_count = total_count + sub_count;
            }
            this.unmake_move(pseudo_moves[i], pieces[0], pieces[1]);
        }
        return total_count;
    }
    read_FEN(fen) {
        let convert = ["k", "r", "n", "q", "b", "p", "", "P", "B", "Q", "N", "R", "K"];
        let rank = 7;
        let file = 0;
        for (let i = 0; i < fen.length; i++) {
            if (fen.charCodeAt(i) >= 65) {
                if (rank == 0 && file == 8) {
                    if (fen[i] == "w") {
                        this.color = 1;
                    }
                    else {
                        this.color = -1;
                    }
                }
                else {
                    let piece = 6;
                    for (let j = 0; j < 13; j++) {
                        if (convert[j] == fen[i]) {
                            piece = j;
                        }
                    }
                    this.board[file][rank] = piece-6;
                    file++;
                }
            }
            else if (fen[i] == "/") {
                rank--;
                file = 0;
            }
            else if (fen.charCodeAt(i) >= 49) {
                file += fen.charCodeAt(i)-48;
            }
        }
    }
    get_FEN() {
        let convert = ["k", "r", "n", "q", "b", "p", "", "P", "B", "Q", "N", "R", "K"];
        let FEN = "";
        for (let i = 7; i >= 0; i--) {
            let empty = 0;
            for (let j = 0; j < 8; j++) {
                if (this.board[j][i] != 0) {
                    if (empty > 0) {
                        FEN = FEN + String.fromCharCode(empty+48);
                        empty = 0;
                    }
                }
                else {
                    empty++;
                }
                FEN = FEN + convert[this.board[j][i]+6];
            }
            if (empty > 0) {
                FEN = FEN + String.fromCharCode(empty+48);
                empty = 0;
            }
            if (i > 0) {
                FEN = FEN + "/";
            }
        }
        if (this.color == 1) {
            FEN = FEN + " w";
        }
        else {
            FEN = FEN + " b";
        }
        return FEN;
    }
}
let test = new Board();
test.set_starting_position();
let primer = 0;
let start_square = "";
let end_square = "";
let highlight = null;
let last_move_from = null;
let last_move_to = null;
let player_color = 0;
function show_highlight(x_coord, y_coord) {
    let offsets = [10, 85, 160, 235, 310, 385, 460, 535];
    highlight.style.left = offsets[x_coord] + "px";
    highlight.style.top = offsets[y_coord] + "px";
    highlight.style.visibility = "visible";
}
function hide_highlight() {
    highlight.style.visibility = "hidden";
}
function show_last_move(from_sq, to_sq) {
    let offsets = [10, 85, 160, 235, 310, 385, 460, 535];
    let from_file = from_sq.charCodeAt(0) - 97;
    let from_y = 8 - parseInt(from_sq[1]);
    last_move_from.style.left = offsets[from_file] + "px";
    last_move_from.style.top = offsets[from_y] + "px";
    last_move_from.style.visibility = "visible";
    let to_file = to_sq.charCodeAt(0) - 97;
    let to_y = 8 - parseInt(to_sq[1]);
    last_move_to.style.left = offsets[to_file] + "px";
    last_move_to.style.top = offsets[to_y] + "px";
    last_move_to.style.visibility = "visible";
}
function hide_last_move() {
    last_move_from.style.visibility = "hidden";
    last_move_to.style.visibility = "hidden";
}
function show_final_accuracy() {
    let lines = [];
    if (whitemoves > 0) {
        lines.push("Your White: " + (100 - whiteloss1 / (10 * whitemoves)).toFixed(1) + "%");
        lines.push("Game White: " + (100 - whiteloss / (10 * whitemoves)).toFixed(1) + "%");
    }
    if (blackmoves > 0) {
        lines.push("Your Black: " + (100 - blackloss1 / (10 * blackmoves)).toFixed(1) + "%");
        lines.push("Game Black: " + (100 - blackloss / (10 * blackmoves)).toFixed(1) + "%");
    }
    document.getElementById("accuracy").innerText = lines.join("\n");
}
function auto_advance() {
    if (ply >= moves.length) return;
    let is_white_turn = (ply % 2 == 0);
    let user_plays_this = (player_color == 0) ||
                          (player_color == 1 && is_white_turn) ||
                          (player_color == -1 && !is_white_turn);
    if (!user_plays_this) {
        make(moves[ply]);
        ply++;
        if (ply >= moves.length) {
            show_final_accuracy();
            ply = 0;
            test.set_starting_position();
            sync_with_board(test);
            hide_last_move();
        } else {
            auto_advance();
        }
    }
}
function make(move) {
    let start_square = move[0]+move[1];
    let end_square = move[2]+move[3];
    document.getElementById(start_square).style.visibility = "hidden";
    document.getElementById(end_square).src = document.getElementById(start_square).src;
    document.getElementById(end_square).style.visibility = "visible";
    test.make_move(start_square+end_square);
    show_last_move(start_square, end_square);
}
function process_click(event) {
    if (positions == null || moves == null) return;
    if (event.clientX < 10 || event.clientX >= 610 || event.clientY < 10 || event.clientY >= 610) return;
    let x_coord = Math.floor((event.clientX - 10) / 75);
    let y_coord = Math.floor((event.clientY - 10) / 75);
    if (x_coord > 7 || y_coord > 7) return;
    let files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    let ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];
    let square = files[x_coord] + ranks[y_coord];
    let piece = test.board[x_coord][7 - y_coord];
    if (primer == 0) {
        if (piece * test.color <= 0) return;
        start_square = square;
        primer = 1;
        show_highlight(x_coord, y_coord);
    }
    else {
        if (square == start_square) {
            primer = 0;
            hide_highlight();
            return;
        }
        if (piece * test.color > 0) {
            start_square = square;
            show_highlight(x_coord, y_coord);
            return;
        }
        hide_highlight();
        primer = 0;
        end_square = square;
        if (test.is_valid_move(start_square+end_square)) {
                let pseudo_moves = test.pseudolegal_moves(test.color);
                let move_count = pseudo_moves.length;
                let maxscore = 0;
                for (let j = 0; j < move_count; j++) {
                    let pieces = test.make_move(pseudo_moves[j]);
                    if (!test.king_attacked(-test.color)) {
                        let wdl = get_analysis(ply, pseudo_moves[j], positions);
                        if (wdl != null) {
                            let score = wdl[2] + 2*wdl[3];
                            if (score > maxscore) {
                                maxscore = score;
                            }
                        }
                    }
                    test.unmake_move(pseudo_moves[j], pieces[0], pieces[1]);
                }
                let pieces = test.make_move(start_square+end_square);
                let wdl = get_analysis(ply, start_square+end_square, positions);
                let score = (wdl != null) ? wdl[2] + 2*wdl[3] : maxscore;
                console.log("Loss for your move: " + (maxscore - score));
                if (ply % 2 == 0) {
                    whiteloss1 += (maxscore - score);
                    whitemoves++;
                }
                else {
                    blackloss1 += (maxscore - score);
                    blackmoves++;
                }
                let string1 = "Your move: " + start_square + end_square + " (";
                if (wdl == null) {
                    string1 = string1 + "?, ";
                }
                else if (wdl[2] == 0 && Math.abs(wdl[0]) < 100) {
                    if (wdl[1] > 0) {
                        string1 = string1 + "+#" + (Math.abs(wdl[0])).toString() + ", ";
                    }
                    else {
                        string1 = string1 + "-#" + (Math.abs(wdl[0])).toString() + ", ";
                    }
                }
                else {
                    if (wdl[0]*(1-2*(ply%2)) < 0) {
                        string1 = string1 + "+";
                    }
                    if (wdl[0]*(1-2*(ply%2)) > 0) {
                        string1 = string1 + "-";
                    }
                    string1 = string1 + (Math.abs(wdl[0]/100)).toString() + ", ";
                }
                string1 = string1 + ((maxscore-score)/20).toString() + "% loss)";
                document.getElementById("you").innerText = string1;
                test.unmake_move(start_square+end_square, pieces[0], pieces[1]);
                make(moves[ply]);
                wdl = get_analysis(ply, moves[ply], positions);
                score = (wdl != null) ? wdl[2] + 2*wdl[3] : maxscore;
                console.log("Loss for played move: " + (maxscore - score));
                if (ply % 2 == 0) {
                    whiteloss += (maxscore - score);
                    whitemoves++;
                }
                else {
                    blackloss += (maxscore - score);
                    blackmoves++;
                }
                string1 = "Played move: " + moves[ply] + " (";
                if (wdl == null) {
                    string1 = string1 + "?, ";
                }
                else if (wdl[2] == 0 && Math.abs(wdl[0]) < 100) {
                    if (wdl[1] > 0) {
                        string1 = string1 + "+#" + (Math.abs(wdl[0])).toString() + ", ";
                    }
                    else {
                        string1 = string1 + "-#" + (Math.abs(wdl[0])).toString() + ", ";
                    }
                }
                else {
                    if (wdl[0]*(1-2*(ply%2)) < 0) {
                        string1 = string1 + "+";
                    }
                    if (wdl[0]*(1-2*(ply%2)) > 0) {
                        string1 = string1 + "-";
                    }
                    string1 = string1 + (Math.abs(wdl[0]/100)).toString() + ", ";
                }
                string1 = string1 + ((maxscore-score)/20).toString() + "% loss)";
                document.getElementById("played").innerText = string1;
                ply++;
                if (ply >= moves.length) {
                    show_final_accuracy();
                    ply = 0;
                    test.set_starting_position();
                    sync_with_board(test);
                    hide_last_move();
                } else {
                    auto_advance();
                }
        }
    }
}
function initialize() {
    let files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    let ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];
    let offsets = ["10px", "85px", "160px", "235px", "310px", "385px", "460px", "535px"];
    for (const [ref, color] of [
        [v => last_move_from = v, "rgba(255, 255, 0, 0.45)"],
        [v => last_move_to = v,   "rgba(255, 255, 0, 0.45)"],
        [v => highlight = v,      "rgba(100, 200, 100, 0.45)"]
    ]) {
        let d = document.createElement("div");
        d.style.position = "absolute";
        d.style.width = "75px";
        d.style.height = "75px";
        d.style.backgroundColor = color;
        d.style.visibility = "hidden";
        d.style.pointerEvents = "none";
        document.body.appendChild(d);
        ref(d);
    }
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            let g = document.createElement("img");
            g.setAttribute("id", files[i]+ranks[j]);
            g.setAttribute("src", "Images/_Pawn.png");
            g.setAttribute("alt", "shatranj piece");
            g.style.top = offsets[j];
            g.style.left = offsets[i];
            g.style.width = "75px";
            g.style.height = "75px";
            document.body.appendChild(g);
        }
    }
}
function sync_with_board(board) {
    let files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    let ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            let piece = board.board[i][7-j];
            let img_source = piece_images[piece+6];
            let square = document.getElementById(files[i]+ranks[j]);
            square.setAttribute("src", img_source);
            if (piece == 0) {
                square.style.visibility = "hidden";
            }
            else {
                square.style.visibility = "visible";
            }
        }
    }
}
let gameIndex = null;
async function loadGame(gameId) {
    const response = await fetch("games/" + gameId + ".json");
    const data = await response.json();
    positions = data.positions;
    moves = data.moves;
    ply = 0;
    whiteloss = 0; whiteloss1 = 0; whitemoves = 0;
    blackloss = 0; blackloss1 = 0; blackmoves = 0;
    primer = 0;
    if (highlight) hide_highlight();
    if (last_move_from) hide_last_move();
    test.set_starting_position();
    sync_with_board(test);
    document.getElementById("you").innerText = "";
    document.getElementById("played").innerText = "";
    document.getElementById("accuracy").innerText = "";
    auto_advance();
}
async function populateGameSelector() {
    const response = await fetch("games/index.json");
    gameIndex = await response.json();
    const select = document.getElementById("game-select");
    for (const game of gameIndex) {
        const option = document.createElement("option");
        option.value = game.id;
        option.textContent = game.name;
        select.appendChild(option);
    }
    select.addEventListener("change", async function() {
        const selected = gameIndex.find(g => g.id === this.value);
        document.getElementById("game-description").innerText = selected.description || "";
        await loadGame(this.value);
    });
    return gameIndex;
}
window.onload = async function() {
    initialize();
    sync_with_board(test);
    const games = await populateGameSelector();
    if (games.length > 0) {
        document.getElementById("game-description").innerText = games[0].description || "";
        await loadGame(games[0].id);
    }
    document.getElementById("color-select").addEventListener("change", async function() {
        player_color = parseInt(this.value);
        const currentGameId = document.getElementById("game-select").value;
        if (currentGameId) await loadGame(currentGameId);
    });
    document.addEventListener("click", process_click);
}
//test.read_FEN("4q1r1/2Pk1p1p/2N1p3/P1B2R2/4R1p1/2NPKnn1/1p4Pb/2Q5 w - - 8 49");
//will check if I need later
/*
    #def read_fen(self, fen: str)
   
    def get_all_pieces(self):
        return self.pieces
    def get_all_colors(self):
        return self.colors
    #gets the piece and color at a coordinate (useful for controller to know)
    def get_info(self, x_coord, y_coord):
        info = []
        info.append(self.pieces[x_coord][y_coord])
        info.append(self.colors[x_coord][y_coord])
        return info
    ------------------------------------------------------------
    def is_valid_move(self, move):
        #prevent possible out of bounds access
        for coordinate in move:
            if coordinate < 0 or coordinate > 7:
                return False
        start_x = move[0]
        start_y = move[1]
        end_x = move[2]
        end_y = move[3]
        #Check that the color to move is correct
        if self.colors[start_x][start_y] != self.to_move[1]:
            return False
        #now generate all moves for this square, and see if the given one is included
        return ([end_x, end_y] in self.get_all_moves(start_x, start_y))
    def is_ep_square(self, x_coord, y_coord):
        return (self.get_algebraic(x_coord, y_coord) == self.ep_square)
    #here move is a UCI string, like "e2e4" or so
    #TODO add castling
    
*/
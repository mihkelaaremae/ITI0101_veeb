const p_status = document.getElementById("p_status");
const p_fen = document.getElementById("p_fen");
const p_pgn = document.getElementById("p_pgn");

const d_mainmenu = document.getElementById("d_mainmenu");
const d_localoptions = document.getElementById("d_localoptions");
const d_botoptions = document.getElementById("d_botoptions");
const d_hostoptions = document.getElementById("d_hostoptions");
const d_joinoptions = document.getElementById("d_joinoptions");
const d_working = document.getElementById("d_working");
const in_code = document.getElementById("in_code");
const in_local_time_inital = document.getElementById("in_local_time_inital");
const in_local_time_increment = document.getElementById("in_local_time_increment");
const in_bot_time_inital = document.getElementById("in_bot_time_inital");
const in_bot_time_increment = document.getElementById("in_bot_time_increment");
const in_host_time_inital = document.getElementById("in_host_time_inital");
const in_host_time_increment = document.getElementById("in_host_time_increment");
const btn_join = document.getElementById("btn_join");
const h1_title = document.getElementById("h1_title");

const board_darkcolor = "#501010";
const board_lightcolor = "#c0c0e0";
const board_bordercolor = "#803030";
const board_yellowcolor = "#e0e070";
const board_borderwidth = 20;
const board_promote_triangle = 15;
const board_promote_margin = 5;

const board_promotionalpha = 0.6;

var board_width = 512;
var board_height = 512;
var board_offx = 50;
var board_offy = 100;

var peer_host;
var peer_self_id;
var peer_client_connection;
var peer_connections = new Array();

const GAMETYPE_LOCAL = 0;
const GAMETYPE_BOT = 1;
const GAMETYPE_HOST = 2;
const GAMETYPE_JOIN = 3;
const GAMETYPE_SPEC = 4;

var gametype = 0;

const GAMESTAT_WHITE_TO_PLAY = 0;
const GAMESTAT_BLACK_TO_PLAY = 1;

const GAMESTAT_WHITE_WIN_CHECKMATE 	= 2;
const GAMESTAT_BLACK_WIN_CHECKMATE 	= 3;
const GAMESTAT_WHITE_WIN_TIME 		= 4;
const GAMESTAT_BLACK_WIN_TIME 		= 5;
const GAMESTAT_WHITE_WIN_RESIGN 	= 6;
const GAMESTAT_BLACK_WIN_RESIGN 	= 7;

const GAMESTAT_DRAW_NOMOVES_WHITE 						= 8;
const GAMESTAT_DRAW_NOMOVES_BLACK 						= 9;
const GAMESTAT_DRAW_WHITE_INSUFFICIENT_VS_BLACK_TIMEOUT = 10;
const GAMESTAT_DRAW_BLACK_INSUFFICIENT_VS_WHITE_TIMEOUT = 11;
const GAMESTAT_DRAW_50 									= 12;
const GAMESTAT_DRAW_3FOLD 								= 13;
const GAMESTAT_DRAW_SHAKE_HANDS 						= 14;
const GAMESTAT_DRAW_INSUFFICIENT_MAT 					= 15;

const GAMESTAT_DESC = 
[
	"...\nWhite to play",
	"...\nBlack to play",
	"Checkmate!\nWhite wins.",
	"Checkmate!\nBlack wins.",
	"Timeout!\nWhite wins.",
	"Timeout!\nBlack wins.",
	"Resignation!\nWhite wins.",
	"Resignation!\nBlack wins.",
	"Draw!\nWhite has no moves and isn't in check.",
	"Draw!\nBlack has no moves and isn't in check.",
	"Draw!\nWhite has insufficient material VS Black timeout.",
	"Draw!\nBlack has insufficient material VS White timeout.",
	"Draw!\n50 half-moves.",
	"Draw!\nThree-fold repetition.",
	"Draw!\nBy agreement.",
	"Draw!\nInsufficient material."
];

const PIECE_PAWN = 0;
const PIECE_HORSEY = 1;
const PIECE_BISHOP = 2;
const PIECE_ROOK = 3;
const PIECE_QUEEN = 4;
const PIECE_KING = 5;

const SIDE_WHITE = 0;
const SIDE_BLACK = 1;

const DEBUG = 1;

var board_canvas;
var board_ctx;

var images = {};
var loading_images = 0;
var loaded_images = 0;

var mouse_x = 0;
var mouse_y = 0;

var mouse_button = false;

const MENU_GAMING = 0;
const MENU_MAINMENU = 1;
const MENU_LOCALOPTIONS = 2;
const MENU_BOTOPTIONS = 3;
const MENU_HOSTOPTIONS = 4;
const MENU_JOINOPTIONS = 5;
const MENU_WORKING = 6;

var menu = MENU_MAINMENU;

var board;

var stockfish;

function make_id()
{
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let result = "";
	let counter = 0;
	while (counter < 6)
	{
		result += characters.charAt(Math.floor(Math.random() * characters.length));
		counter += 1;
	}
	return result;
}

function check_id(id)
{
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	if (id.length != 6)
	{
		return 0;
	}
	for (let i = 0; i < id.length; i++)
	{
		if (!characters.includes(id.charAt(i)))
		{
			return 0;
		}
	}
	return 1;
}

function encode_coordinates(x, y)
{
	const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
	return files[x] + (y + 1);
}

function encode_file(x)
{
	const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
	return files[x];
}

function format_time(ms)
{
	if (ms > 1000*60*60)
	{
		return String(Math.floor(ms/1000/60/60)).padStart(2, '0') + ":" + String(Math.floor(ms/1000/60) % 60).padStart(2, '0') + ":" + String(Math.floor(ms/1000) % 60).padStart(2, '0');
	}
	else
	{
		return String(Math.floor(ms/1000/60) % 60).padStart(2, '0') + ":" + String(Math.floor(ms/1000) % 60).padStart(2, '0');
	}
}

function parse_time(string)
{
	const words = string.split(":").reverse();
	var ms = 0;
	if (words.length >= 1)
	{
		ms += 1000*Number(words[0]);
	}
	if (words.length >= 2)
	{
		ms += 1000*60*Number(words[1]);
	}
	if (words.length >= 3)
	{
		ms += 1000*60*60*Number(words[2]);
	}
	return ms;
}

class Piece
{
	constructor(x, y, piece, side)
	{
		this.x = x;
		this.y = y;
		this.piece = piece;
		this.side = side;
		this.is_lifted = false;
		this.grab_offx = 0;
		this.grab_offy = 0;
		this.legalmoves = [];
	}
	
	draw(board)
	{
		const w = images["pieces"].width;
		const h = images["pieces"].height;
		var bx = this.x;
		var by = this.y;
		if (board.facing_side == SIDE_WHITE)
		{
			by = 7 - by;
		}
		else
		{
			bx = 7 - bx;
		}
		if (this.is_lifted)
		{
			board_ctx.globalAlpha = 0.4;
			board_ctx.drawImage(images["pieces"], 
				this.piece * w / 6, 
				this.side * h / 2, 
				w / 6, 
				h / 2, 
				bx*board_width/8 + board_offx, 
				by*board_height/8 + board_offy, 
				board_width/8, 
				board_height/8);
			board_ctx.globalAlpha = 0.4;
			board_ctx.drawImage(images["pieces"], 
				this.piece * w / 6, 
				this.side * h / 2, 
				w / 6, 
				h / 2, 
				mouse_x + this.grab_offx, 
				mouse_y + this.grab_offy,
				board_width/8, 
				board_height/8);
			board_ctx.globalAlpha = 1;
		}
		else
		{
			board_ctx.globalAlpha = 1;
			board_ctx.drawImage(images["pieces"], 
				this.piece * w / 6, 
				this.side * h / 2, 
				w / 6, 
				h / 2, 
				bx*board_width/8 + board_offx, 
				by*board_height/8 + board_offy, 
				board_width/8, 
				board_height/8);
		}
	}

	draw_legal(board)
	{
		if (this.is_lifted)
		{
			board_ctx.globalAlpha = 0.4;
			board_ctx.fillStyle = "black";
			for (var i = 0; i < this.legalmoves.length; i++)
			{
				board_ctx.fillRect(
					board.flip_x(this.legalmoves[i][0])*board_width/8 + board_offx + board_width/32, 
					board.flip_y(this.legalmoves[i][1])*board_height/8 + board_offy + board_height/32, 
					board_width/8 * 0.5, 
					board_height/8 * 0.5);
			}
			board_ctx.globalAlpha = 1;
		}
	}
}

class Board
{
	constructor()
	{
		this.pieces = [];
		this.whitescore = 0;
		this.blackscore = 0;
		this.facing_side = SIDE_WHITE;
		this.logic = new LogicBoard();
		this.logic.parent = this;
		this.promotion_prompt = false;
		this.move_from_x = -1;
		this.move_from_y = -1;
		this.move_to_x = -1;
		this.move_to_y = -1;
		this.enable_board = false;
		this.disabled_side = -1;
	}

	flip()
	{
		this.facing_side = 1 - this.facing_side;
	}

	reconstruct()
	{
		this.pieces = [];
		for (var i = 0; i < 8; i++)
		{
			for (var j = 0; j < 8; j++)
			{
				const p = this.logic.get_piece(i, j);
				const s = this.logic.get_side(i, j);
				if (p != -1)
				{
					var piece = new Piece();
					piece.piece = p;
					piece.side = s;
					piece.x = i;
					piece.y = j;
					piece.legalmoves = this.logic.get_legal_moves(i, j);
					this.pieces.push(piece);
				}
			}
		}
	}

	gameend()
	{
		this.enable_board = false;
		this.promotion_prompt = false;
	}

	update_board()
	{
		this.logic.compute_state();
		if (this.logic.side_to_move > 2)
		{
			this.gameend();
		}
		p_status.innerHTML = GAMESTAT_DESC[this.logic.side_to_move];
		p_pgn.innerHTML = "PGN:\n" + this.logic.pgn;
		p_fen.innerHTML = "FEN:\n" + this.logic.get_fen();
		this.reconstruct();
	}

	complete_move()
	{
		if (gametype == GAMETYPE_JOIN)
		{
			peer_client_connection.send("move " + this.move_from_x + " " + this.move_from_y + " " + this.move_to_x + " " + this.move_to_y + " " + this.logic.promotion_choice);
		}
		if (gametype == GAMETYPE_HOST)
		{
			peer_connections[0].send("move " + this.move_from_x + " " + this.move_from_y + " " + this.move_to_x + " " + this.move_to_y + " " + this.logic.promotion_choice + " " + this.logic.whitetime_ms + " " + this.logic.blacktime_ms);
		}
		this.promotion_prompt = false;
		this.logic.move_piece(this.move_from_x, this.move_from_y, this.move_to_x, this.move_to_y);
		this.update_board();
	}

	moved_piece(p)
	{
		if (p.piece == PIECE_PAWN &&
			((p.side == SIDE_WHITE && this.move_to_y == 7) ||
			(p.side == SIDE_BLACK && this.move_to_y == 0)))
		{
			this.promotion_prompt = true;
		}
		else
		{
			this.complete_move();
		}
	}
	
	unlift_all()
	{
		for (const p of this.pieces)
		{
			if (p.is_lifted)
			{
				p.is_lifted = false;
				const bx = this.board_x(mouse_x);
				const by = this.board_y(mouse_y);
				if (bx >= 0 && by >= 0 && bx < 8 && by < 8 &&
					p.legalmoves.some(item => item[0] == bx && item[1] == by))
				{
					const p2 = this.get_piece(bx, by);
					this.move_is_capture = false;
					if (p2 && p2 != p)
					{
						this.move_is_capture = true;
					}
					this.move_to_x = bx;
					this.move_to_y = by;
					this.move_from_x = p.x;
					this.move_from_y = p.y;
					this.moved_piece(p);
				}
				break;
			}
		}
	}
	
	reset()
	{
		this.pieces = [];
		this.promotion_prompt = false;
		this.move_from_x = -1;
		this.move_from_y = -1;
		this.move_to_x = -1;
		this.move_to_y = -1;
		this.enable_board = true;
		this.logic.reset();
		this.reconstruct();
		this.logic.compute_state();
		p_status.innerHTML = GAMESTAT_DESC[this.logic.side_to_move];
	}
	
	reset_stockfish()
	{
		//stockfish.postMessage("ucinewgame");
		//stockfish.postMessage("position fen \"" + board.get_fen() + "\"");
		//stockfish.postMessage("go");
	}

	board_x(x)
	{
		x -= board_offx;
		if (this.facing_side == SIDE_BLACK)
		{
			return 7 - Math.floor(x*8/board_width);
		}
		return Math.floor(x*8/board_width);
	}

	board_y(y)
	{
		y -= board_offy;
		if (this.facing_side == SIDE_WHITE)
		{
			return 7 - Math.floor(y*8/board_height);
		}
		return Math.floor(y*8/board_height);
	}

	visual_x(bx)
	{
		if (this.facing_side == SIDE_BLACK)
		{
			return (7-bx)*board_width/8 + board_offx;
		}
		return bx*board_width/8 + board_offx;
	}

	visual_y(by)
	{
		if (this.facing_side == SIDE_WHITE)
		{
			return (7-by)*board_height/8 + board_offy;
		}
		return by*board_height/8 + board_offy;
	}

	flip_x(x)
	{
		if (this.facing_side == SIDE_WHITE)
		{
			return x;
		}
		return 7-x;
	}

	flip_y(y)
	{
		if (this.facing_side == SIDE_WHITE)
		{
			return 7-y;
		}
		return y;
	}
	
	grab_piece(x, y)
	{
		const bx = this.board_x(x);
		const by = this.board_y(y);
		var p = this.get_piece(bx, by);
		if (p)
		{
			if (p.side != this.logic.side_to_move)
			{
				return null;
			}
			p.is_lifted = true;
			/*p.grab_offx = p.x * board_width / 8 - x;
			p.grab_offy = p.y * board_height / 8 - y;*/
			p.grab_offx = this.visual_x(p.x) - x;
			p.grab_offy = this.visual_y(p.y) - y;
		}
		return p;
	}
	
	get_piece(x, y)
	{
		for (const p of this.pieces)
		{
			if (p.x == x && p.y == y)
			{
				return p;
			}
		}
		return null;
	}

	draw_time()
	{
		board_ctx.font = "21px serif";
		board_ctx.textAlign = "center";
		board_ctx.textBaseline = "middle";
		if (this.facing_side == SIDE_WHITE)
		{
			board_ctx.fillStyle = "white";
			board_ctx.fillText(format_time(this.logic.whitetime_ms), board_offx + 50, board_offy + board_height + 30);
			board_ctx.fillStyle = "black";
			board_ctx.fillText(format_time(this.logic.blacktime_ms), board_offx + 50, board_offy - 30);
		}
		else
		{
			board_ctx.fillStyle = "white";
			board_ctx.fillText(format_time(this.logic.whitetime_ms), board_offx + 50, board_offy - 30);
			board_ctx.fillStyle = "black";
			board_ctx.fillText(format_time(this.logic.blacktime_ms), board_offx + 50, board_offy + board_height + 30);
		}
	}
	
	draw_board()
	{
		board_ctx.fillStyle = board_bordercolor;
		board_ctx.fillRect(board_offx - board_borderwidth, board_offy - board_borderwidth, board_width + board_borderwidth * 2, board_height + board_borderwidth * 2);
		for (var i = 0; i < 8; i++)
		{
			for (var j = 0; j < 8; j++)
			{
				board_ctx.fillStyle = (((i+j)%2) == 0) ? board_lightcolor : board_darkcolor;
				board_ctx.fillRect(i*board_width/8 + board_offx, j*board_height/8 + board_offy, board_width/8, board_height/8);
				if ((this.flip_x(i) == this.move_from_x &&
					this.flip_y(j) == this.move_from_y) ||
					(this.flip_x(i) == this.move_to_x &&
					this.flip_y(j) == this.move_to_y))
				{
					board_ctx.globalAlpha = 0.6;
					board_ctx.fillStyle = board_yellowcolor;
					board_ctx.fillRect(i*board_width/8 + board_offx, j*board_height/8 + board_offy, board_width/8, board_height/8);
					board_ctx.globalAlpha = 1;
				}
			}
		}
		const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
		const ranks = ["1", "2", "3", "4", "5", "6", "7", "8"];
		board_ctx.fillStyle = "white";
		board_ctx.font = "15px serif";
		board_ctx.textAlign = "center";
		board_ctx.textBaseline = "middle";
		for (var i = 0; i < 8; i++)
		{
			var index = i;
			if (this.facing_side == SIDE_BLACK)
			{
				index = 7 - i;
			}
			board_ctx.fillText(files[index], board_offx + i*board_width/8 + board_width/16, board_offy + board_height + board_borderwidth / 2);
			board_ctx.fillText(ranks[7-index], board_offx - board_borderwidth / 2, board_offy + i*board_height/8 + board_height/16);
		}
	}
	
	draw_pieces()
	{
		for (const p of this.pieces)
		{
			p.draw(this);
		}
	}

	draw_legalmoves()
	{
		for (const p of this.pieces)
		{
			p.draw_legal(this);
		}
	}

	draw_promotion()
	{
		if (this.logic.side_to_move == SIDE_WHITE)
		{
			board_ctx.fillStyle = board_darkcolor;
		}
		else
		{
			board_ctx.fillStyle = board_lightcolor;
		}

		var mx = this.move_to_x;
		var my = 7-this.move_to_y;
		if (this.facing_side == SIDE_BLACK)
		{
			mx = 7-mx;
			my = 7-my;
		}
		const tx = board_offx + board_width/8 * mx + board_width/16;
		const ty = board_offy + board_height/8 * my;
		board_ctx.beginPath();
		board_ctx.moveTo(tx, ty);
		board_ctx.lineTo(tx-board_promote_triangle, ty-board_promote_triangle);
		board_ctx.lineTo(tx+board_promote_triangle, ty-board_promote_triangle);
		board_ctx.lineTo(tx, ty);
		board_ctx.closePath();
		board_ctx.fill();

		var promote_w = board_promote_margin * 2 + board_width / 8;
		var promote_x = tx - 2 * promote_w;
		var promote_y = ty-board_promote_triangle-promote_w;
		if (promote_x < board_offx - board_borderwidth)
		{
			promote_x = board_offx - board_borderwidth;
		}
		else if (promote_x + promote_w * 4 > board_offx + board_width + board_borderwidth)
		{
			promote_x = board_offx + board_width + board_borderwidth - promote_w * 4;
		}
		board_ctx.fillRect(promote_x, promote_y, promote_w*4, promote_w);
		const pieces = [PIECE_HORSEY, PIECE_BISHOP, PIECE_ROOK, PIECE_QUEEN];
		for (var i = 0; i < 4; i++)
		{
			var hover = false;
			if (mouse_x > promote_x + board_promote_margin &&
				mouse_y > promote_y + board_promote_margin &&
				mouse_x < promote_x + board_promote_margin + board_width / 8 &&
				mouse_y < promote_y + board_promote_margin + board_width / 8)
			{
				hover = true;
			}
			if (hover)
			{
				board_ctx.globalAlpha = 1.0;
			}
			else
			{
				board_ctx.globalAlpha = 0.4;
			}
			if (hover && mouse_button)
			{
				this.logic.promotion_choice = pieces[i];
				this.complete_move();
			}
			const w = images["pieces"].width;
			const h = images["pieces"].height;
			board_ctx.drawImage(images["pieces"], 
				pieces[i] * w / 6, 
				this.logic.side_to_move * h / 2, 
				w / 6, 
				h / 2, 
				promote_x + board_promote_margin, 
				promote_y + board_promote_margin, 
				board_width/8, 
				board_height/8);
			promote_x += promote_w;
		}
		board_ctx.globalAlpha = 1.0;
	}
	
	draw()
	{
		this.draw_time();
		this.draw_board();
		this.draw_pieces();
		this.draw_legalmoves();
		if (this.promotion_prompt)
		{
			this.draw_promotion();
		}
	}
}

function canvas_on_mouse_down(e)
{
	if (e.button != 0)
	{
		return;
	}
	if (!board)
	{
		return;
	}
	if (!board.enable_board)
	{
		return;
	}
	if (board.disabled_side == board.logic.side_to_move)
	{
		return;
	}
	mouse_button = true;
	if (board.grab_piece(mouse_x, mouse_y))
	{
		e.preventDefault();
	}
}

function canvas_on_mouse_move(e)
{
	var rect = board_canvas.getBoundingClientRect();
	mouse_x = e.clientX - rect.left,
	mouse_y = e.clientY - rect.top
}

function canvas_on_mouse_up(e)
{
	if (e.button != 0)
	{
		return;
	}
	if (!board)
	{
		return;
	}
	mouse_button = false;
	board.unlift_all();
}

function switchmenu()
{
	if (menu == MENU_GAMING)
	{
		board.enable_board = true;
	}
	else
	{
		board.enable_board = false;
	}
	switch (menu)
	{
	case MENU_GAMING:
		d_mainmenu.hidden = true;
		d_localoptions.hidden = true;
		d_botoptions.hidden = true;
		d_hostoptions.hidden = true;
		d_joinoptions.hidden = true;
		d_working.hidden = true;
		break;

	case MENU_MAINMENU:
		d_mainmenu.hidden = false;
		d_localoptions.hidden = true;
		d_botoptions.hidden = true;
		d_hostoptions.hidden = true;
		d_joinoptions.hidden = true;
		d_working.hidden = true;
		h1_title.innerHTML = window.location.host;
		break;

	case MENU_LOCALOPTIONS:
		d_mainmenu.hidden = true;
		d_localoptions.hidden = false;
		d_botoptions.hidden = true;
		d_hostoptions.hidden = true;
		d_joinoptions.hidden = true;
		d_working.hidden = true;
		break;

	case MENU_BOTOPTIONS:
		d_mainmenu.hidden = true;
		d_localoptions.hidden = true;
		d_botoptions.hidden = false;
		d_hostoptions.hidden = true;
		d_joinoptions.hidden = true;
		d_working.hidden = true;
		break;

	case MENU_HOSTOPTIONS:
		d_mainmenu.hidden = true;
		d_localoptions.hidden = true;
		d_botoptions.hidden = true;
		d_hostoptions.hidden = false;
		d_joinoptions.hidden = true;
		d_working.hidden = true;
		break;

	case MENU_JOINOPTIONS:
		d_mainmenu.hidden = true;
		d_localoptions.hidden = true;
		d_botoptions.hidden = true;
		d_hostoptions.hidden = true;
		d_joinoptions.hidden = false;
		d_working.hidden = true;
		btn_join.disabled = !check_id(in_code.value);
		break;

	case MENU_WORKING:
		d_mainmenu.hidden = true;
		d_localoptions.hidden = true;
		d_botoptions.hidden = true;
		d_hostoptions.hidden = true;
		d_joinoptions.hidden = true;
		d_working.hidden = false;
		break;
	}
}

function draw()
{
	switchmenu();
	board_ctx.clearRect(0, 0, board_canvas.width, board_canvas.height);
	board.draw();
	board.logic.heartbeat();

	mouse_button = false;

	window.requestAnimationFrame(draw);
}

function button_playlocal()
{
	menu = MENU_LOCALOPTIONS;
}

function button_playbot()
{
	menu = MENU_BOTOPTIONS;
}

function button_host()
{
	menu = MENU_HOSTOPTIONS;
}

function button_join()
{
	menu = MENU_JOINOPTIONS;
}

function button_back()
{
	menu = MENU_MAINMENU;
}

function button_go_local()
{
	menu = MENU_GAMING;
	board.logic.timecontrol_initialms = parse_time(in_local_time_inital.value);
	board.logic.timecontrol_addms = parse_time(in_local_time_increment.value);
	board.reset();
}

function button_go_bot()
{
	menu = MENU_GAMING;
	board.logic.timecontrol_initialms = parse_time(in_bot_time_inital.value);
	board.logic.timecontrol_addms = parse_time(in_bot_time_increment.value);
	board.reset();
}

function button_go_host()
{
	menu = MENU_WORKING;
	board.logic.timecontrol_initialms = parse_time(in_host_time_inital.value);
	board.logic.timecontrol_addms = parse_time(in_host_time_increment.value);
	board.reset();
	peer_connections = new Array();
	peer_self_id = make_id();
	peer_host = new Peer("CHESSGAME_HOST" + peer_self_id);
	peer_host.on("open", () =>
	{
		h1_title.innerHTML = window.location.host + "/?" + peer_self_id;
		peer_host.on("connection", (conn) => 
		{
			conn.on("open", (id) => 
			{
				var side = SIDE_WHITE;
				menu = MENU_GAMING;
				gametype = GAMETYPE_HOST;
				peer_connections.push(conn);
				if (peer_connections.length == 1)
				{
					console.log("SENDING CONNECT");
					board.reset();
					board.facing_side = side;
					board.disabled_side = 1-side;
					conn.on("data", (data) =>
					{
						console.log("server got data " + data);
						const words = data.split(" ");
						console.log(words);
						if (words[0] == "move")
						{
							board.move_from_x = Number(words[1]);
							board.move_from_y = Number(words[2]);
							board.move_to_x = Number(words[3]);
							board.move_to_y = Number(words[4]);
							board.logic.promotion_choice = Number(words[5]);
							board.logic.move_piece(board.move_from_x, board.move_from_y, board.move_to_x, board.move_to_y);
							board.update_board();
						}
					});
					conn.on("error", (error) =>
					{
						console.log("ERROR" + error);
					});
					conn.on("close", () =>
					{
						console.log("CLOSE");
					});
					conn.send("connect " + (1-side) + " " + GAMETYPE_JOIN + " " + board.logic.timecontrol_initialms + " " + board.logic.timecontrol_addms);
				}
				else
				{
					conn.send("connect " + side + " " + GAMETYPE_JOIN + " " + board.logic.timecontrol_initialms + " " + board.logic.timecontrol_addms);
				}
			});
		});
	});
}

function button_go_join()
{
	menu = MENU_WORKING;
	board.reset();
	peer_connections = new Array();
	peer_self_id = make_id();
	peer_host = new Peer("CHESSGAME_JOIN" + peer_self_id);
	peer_host.on("open", () =>
	{
		peer_client_connection = peer_host.connect("CHESSGAME_HOST" + in_code.value, {reliable: true});
		peer_client_connection.on("open", (id) =>
		{
			console.log("CLIENT OPEN");
			peer_client_connection.on("data", (data) =>
			{
				console.log("client got data " + data);
				const words = data.split(" ");
				console.log(words);
				if (words[0] == "connect")
				{
					var side = words[1];
					board.logic.timecontrol_initialms = Number(words[3]);
					board.logic.timecontrol_addms = Number(words[4]);
					board.reset();
					board.facing_side = side;
					board.disabled_side = 1-side;
					menu = MENU_GAMING;
					gametype = GAMETYPE_JOIN;
				}
				else if (words[0] == "move")
				{
					board.logic.whitetime_ms = Number(words[6]);
					board.logic.blacktime_ms = Number(words[7]);
					board.move_from_x = Number(words[1]);
					board.move_from_y = Number(words[2]);
					board.move_to_x = Number(words[3]);
					board.move_to_y = Number(words[4]);
					board.logic.promotion_choice = Number(words[5]);
					board.logic.move_piece(board.move_from_x, board.move_from_y, board.move_to_x, board.move_to_y);
					board.update_board();
				}
			});
		});
		peer_client_connection.on("close", () =>
		{
			console.log("CLOSE");
			menu = MENU_MAINMENU;
			in_code.value = "";
		});
		peer_client_connection.on("error", (error) =>
		{
			console.log("CLOSE " + error);
			menu = MENU_MAINMENU;
			in_code.value = "";
		});
	});
	peer_host.on("disconnected", () =>
	{
		console.log("DISCONNECT");
		menu = MENU_MAINMENU;
		in_code.value = "";
	});
	peer_host.on("error", (err) =>
	{
		console.log("ERROR " + err);
		menu = MENU_MAINMENU;
		in_code.value = "";
	});
}


function load_image(name, src)
{
	loading_images++;
	images[name] = new Image();
	images[name].onload = function()
	{
		loaded_images++;
		if (loaded_images == loading_images)
		{
			window.requestAnimationFrame(draw);
		}
	};
	images[name].imagesource = src;
}

function stockfish_message(message)
{
	console.log(message.data);
}

function stockfish_error(message)
{
	console.log("Error");
	console.log(message.data);
}

function init_images()
{
	load_image("pieces", "nupud.png");
	for (var [key, value] of Object.entries(images))
	{
		value.src = value.imagesource;
	}
}

function init_debug()
{
	var b_flipboard = document.createElement("button");
	b_flipboard.innerHTML = "Flip board";
	b_flipboard.onclick = function()
	{
		if (board)
		{
			board.flip();
		}
	};
	var b_resetboard = document.createElement("button");
	b_resetboard.innerHTML = "Reset board";
	b_resetboard.onclick = function()
	{
		if (board)
		{
			board.reset();
			board.reset_stockfish();
		}
	};
	document.getElementById("rightcol").appendChild(b_flipboard);
	document.getElementById("rightcol").appendChild(document.createElement("br"));
	//document.getElementById("rightcol").appendChild(b_resetboard);
	document.getElementById("rightcol").appendChild(document.createElement("br"));
}

function init_stockfish()
{
	stockfish = new Worker("stockfish.js");
	stockfish.onmessage = stockfish_message;
	stockfish.onerror = stockfish_error;
	stockfish.postMessage("uci");
}

function init()
{
	h1_title.innerHTML = window.location.host;
	board_canvas = document.createElement("canvas");
	board_canvas.width = board_width + 100;
	board_canvas.height = board_height + 200;
	document.getElementById("centercol").appendChild(board_canvas);
	document.body.onmousedown = canvas_on_mouse_down;
	document.body.onmousemove = canvas_on_mouse_move;
	document.body.onmouseup = canvas_on_mouse_up;
	board_ctx = board_canvas.getContext("2d");
	board = new Board();
	board.reset();
	if (DEBUG)
	{
		init_debug();
	}
	init_images();
	init_stockfish();
	board.reset_stockfish();
	const id = window.location.search.substring(1);
	if (window.location.search != "" && check_id(id))
	{
		h1_title.innerHTML = window.location.host + "/?" + id;
		in_code.value = id;
		button_go_join();
	}
}

init();

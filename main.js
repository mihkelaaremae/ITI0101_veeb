const board_darkcolor = "#501010";
const board_lightcolor = "#c0c0e0";
const board_bordercolor = "#803030";
const board_borderwidth = 20;
const board_promote_triangle = 15;
const board_promote_margin = 5;

const board_promotionalpha = 0.6;

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

var board_width = 512;
var board_height = 512;
var board_offx = 50;
var board_offy = 100;

var images = {};
var loading_images = 0;
var loaded_images = 0;

var mouse_x = 0;
var mouse_y = 0;

var mouse_button = false;

var board;

var stockfish;

function encode_coordinates(x, y)
{
	const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
	return files[x] + y;
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
	}
	
	draw(board)
	{
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
			board_ctx.drawImage(images["pieces"], this.piece * 32, this.side * 32, 32, 32, bx*board_width/8 + board_offx, by*board_height/8 + board_offy, board_width/8, board_height/8);
			board_ctx.globalAlpha = 0.4;
			board_ctx.drawImage(images["pieces"], this.piece * 32, this.side * 32, 32, 32, mouse_x + this.grab_offx, mouse_y + this.grab_offy, board_width/8, board_height/8);
			board_ctx.globalAlpha = 1;
		}
		else
		{
			board_ctx.globalAlpha = 0.8;
			board_ctx.drawImage(images["pieces"], this.piece * 32, this.side * 32, 32, 32, bx*board_width/8 + board_offx, by*board_height/8 + board_offy, board_width/8, board_height/8);
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
		this.side_to_move = SIDE_WHITE;
		this.facing_side = SIDE_WHITE;
		this.white_castle_kingside = true;
		this.white_castle_queenside = true;
		this.black_castle_kingside = true;
		this.black_castle_queenside = true;
		this.enpassantx = -1;
		this.enpassanty = -1;
		this.halfmoves = 0;
		this.fullmoves = 0;
		this.promotion_prompt = false;
		this.move_from_x = 0;
		this.move_from_y = 0;
		this.move_to_x = 0;
		this.move_to_y = 0;
		this.move_is_capture = false;
		this.move_promotion_result = 0;
		this.enable_lifting = true;
	}

	flip()
	{
		this.facing_side = 1 - this.facing_side;
	}

	complete_move()
	{
		if (this.promotion_prompt)
		{
			var p = this.get_piece(this.move_to_x, this.move_to_y);
			p.piece = this.move_promotion_result;
		}
		this.side_to_move = 1 - this.side_to_move;
		stockfish.postMessage("position fen \"" + board.get_fen() + "\"");
		stockfish.postMessage("go");

		this.promotion_prompt = false;
	}

	moved_piece(p, x, y, capture)
	{
		if (this.side_to_move == SIDE_WHITE)
		{
			if (p.piece == PIECE_KING)
			{
				this.white_castle_kingside = false;
				this.white_castle_queenside = false;
			}
			if (p.piece == PIECE_ROOK && y == 0)
			{
				if (x == 0)
				{
					this.white_castle_queenside = false;
				}
				if (x == 7)
				{
					this.white_castle_kingside = false;
				}
			}
		}
		else
		{
			if (p.piece == PIECE_KING)
			{
				this.black_castle_kingside = false;
				this.black_castle_queenside = false;
			}
			if (p.piece == PIECE_ROOK && y == 7)
			{
				if (x == 0)
				{
					this.black_castle_queenside = false;
				}
				if (x == 7)
				{
					this.black_castle_kingside = false;
				}
			}
		}
		this.enpassantx = -1;
		this.enpassanty = -1;
		if (p.piece == PIECE_PAWN)
		{
			if (Math.abs(y - p.y) == 2)
			{
				this.enpassantx = x;
				this.enpassanty = y;
				if (this.side_to_move == SIDE_WHITE)
				{
					this.enpassanty --;
				}
				else
				{
					this.enpassanty ++;
				}
			}
		}
		if (p.piece == PIECE_PAWN || capture)
		{
			this.halfmoves = 0;
		}
		else
		{
			this.halfmoves ++;
		}
		if (this.side_to_move == SIDE_BLACK)
		{
			this.fullmoves ++;
		}
		if (p.piece == PIECE_PAWN &&
			((this.side_to_move == SIDE_WHITE && y == 7) ||
			(this.side_to_move == SIDE_BLACK && y == 0)))
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
				if (bx >= 0 && by >= 0 && bx < 8 && by < 8)
				{
					const p2 = this.get_piece(bx, by);
					this.move_is_capture = false;
					if (p2 && p2 != p)
					{
						this.move_is_capture = true;
						this.pieces.splice(this.pieces.indexOf(p2), 1);
					}
					this.move_from_x = bx;
					this.move_from_y = by;
					p.x = bx;
					p.y = by;
					this.move_to_x = p.x;
					this.move_to_y = p.y;
					this.moved_piece(p, this.move_to_x, this.move_to_y, this.move_is_capture);
				}
			}
		}
	}
	
	reset()
	{
		this.pieces = [];
		this.promotion_prompt = false;
		this.side_to_move = SIDE_WHITE;
		this.white_castle_kingside = true;
		this.white_castle_queenside = true;
		this.black_castle_kingside = true;
		this.black_castle_queenside = true;
		this.enpassantx = -1;
		this.enpassanty = -1;
		this.halfmoves = 0;
		this.fullmoves = 0;
	}
	
	default_layout()
	{
		const layout = [3, 1, 2, 4, 5, 2, 1, 3];
		for (var i = 0; i < 8; i++)
		{
			this.pieces.push(new Piece(i, 0, layout[i], SIDE_WHITE));
			this.pieces.push(new Piece(i, 1, PIECE_PAWN, SIDE_WHITE));
			this.pieces.push(new Piece(i, 7, layout[i], SIDE_BLACK));
			this.pieces.push(new Piece(i, 6, PIECE_PAWN, SIDE_BLACK));
		}
	}

	reset_stockfish()
	{
		stockfish.postMessage("ucinewgame");
		stockfish.postMessage("position fen \"" + board.get_fen() + "\"");
		stockfish.postMessage("go");
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
	
	grab_piece(x, y)
	{
		const bx = this.board_x(x);
		const by = this.board_y(y);
		var p = this.get_piece(bx, by);
		if (p)
		{
			if (p.side != this.side_to_move)
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

	draw_promotion()
	{
		board_ctx.fillStyle = "#000000";
		board_ctx.globalAlpha = board_promotionalpha;
		board_ctx.fillRect(0, 0, board_canvas.width, board_canvas.height);
		board_ctx.globalAlpha = 1.0;
		if (this.side_to_move == SIDE_WHITE)
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
				this.move_promotion_result = pieces[i];
				this.complete_move();
			}
			board_ctx.drawImage(images["pieces"], pieces[i] * 32, this.side_to_move * 32, 32, 32, 
				promote_x + board_promote_margin, 
				promote_y + board_promote_margin, 
				board_width/8, board_height/8);
			promote_x += promote_w;
		}
		board_ctx.globalAlpha = 1.0;
	}
	
	draw()
	{
		this.draw_board();
		this.draw_pieces();
		if (this.promotion_prompt)
		{
			this.draw_promotion();
		}
	}

	get_fen()
	{
		const pieces_black = ["p","n","b","r","q","k"];
		const pieces_white = ["P","N","B","R","Q","K"];
		var fenstring = "";
		var amount_blank = 0;
		for (var i = 7; i >= 0; i--)
		{
			for (var j = 0; j < 8; j++)
			{
				var p = this.get_piece(j, i);
				if (!p)
				{
					amount_blank ++;
				}
				else
				{
					if (amount_blank != 0)
					{
						fenstring += String(amount_blank);
						amount_blank = 0;
					}
					if (p.side == SIDE_WHITE)
					{
						fenstring += pieces_white[p.piece];
					}
					else
					{
						fenstring += pieces_black[p.piece];
					}
				}
			}
			if (amount_blank != 0)
			{
				fenstring += String(amount_blank);
				amount_blank = 0;
			}
			if (i != 0)
			{
				fenstring += "/";
			}
		}
		fenstring += " " + (this.side_to_move == SIDE_WHITE ? "w" : "b");
		fenstring += " ";
		if (!this.white_castle_kingside &&
			!this.white_castle_queenside &&
			!this.black_castle_kingside &&
			!this.black_castle_queenside)
		{
			fenstring += "-";
		}
		else
		{
			if (this.white_castle_kingside)
			{
				fenstring += "K";
			}
			if (this.white_castle_queenside)
			{
				fenstring += "Q";
			}
			if (this.black_castle_kingside)
			{
				fenstring += "k";
			}
			if (this.black_castle_queenside)
			{
				fenstring += "q";
			}
		}
		fenstring += " ";
		if (this.enpassantx == -1 &&
			this.enpassanty == -1)
		{
			fenstring += "-";
		}
		else
		{
			fenstring += encode_coordinates(this.enpassantx, this.enpassanty);
		}
		fenstring += " " + this.halfmoves + " " + this.fullmoves;
		return fenstring;
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
	if (!board.enable_lifting)
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

function draw()
{
	board_ctx.clearRect(0, 0, board_canvas.width, board_canvas.height);
	board.draw();

	mouse_button = false;

	window.requestAnimationFrame(draw);
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
			board.default_layout();
			board.reset_stockfish();
		}
	};
	document.getElementById("rightcol").appendChild(b_flipboard);
	document.getElementById("rightcol").appendChild(document.createElement("br"));
	document.getElementById("rightcol").appendChild(b_resetboard);
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
	board_canvas = document.createElement("canvas");
	board_canvas.width = board_width + 100;
	board_canvas.height = board_height + 200;
	document.getElementById("centercol").appendChild(board_canvas);
	document.body.onmousedown = canvas_on_mouse_down;
	document.body.onmousemove = canvas_on_mouse_move;
	document.body.onmouseup = canvas_on_mouse_up;
	board_ctx = board_canvas.getContext("2d");
	board = new Board();
	board.default_layout();
	if (DEBUG)
	{
		init_debug();
	}
	init_images();
	init_stockfish();
	board.reset_stockfish();
}

init();
class LogicBoard
{
	constructor()
	{
		this.parent = null;
		this.pieces = new Array(64);
		this.sides = new Array(64);
		this.enpassant_x = -1;
		this.enpassant_y = -1;
		this.castle_white_kingside = true;
		this.castle_white_queenside = true;
		this.castle_black_kingside = true;
		this.castle_black_queenside = true;
		this.halfmoves = 0;
		this.fullmoves = 0;
		this.side_to_move = SIDE_WHITE;
		this.promotion_choice = PIECE_QUEEN;
		this.pgn = "";
		this.is_copy = false;
		this.movehistory = [];
		this.whitetime_ms = 0;
		this.blacktime_ms = 0;
		this.activetimer = -1;
		this.timecontrol_addms = 1000;
		this.timecontrol_initialms = 10000 * 60;
		this.lastheartbeat = null;
	}

	copy()
	{
		var result = new LogicBoard();
		result.pieces = [...this.pieces];
		result.sides = [...this.sides];
		result.enpassant_x = this.enpassant_x;
		result.enpassant_y = this.enpassant_y;
		result.castle_white_kingside = this.castle_white_kingside;
		result.castle_white_queenside = this.castle_white_queenside;
		result.castle_black_kingside = this.castle_black_kingside;
		result.castle_black_queenside = this.castle_black_queenside;
		result.is_copy = true;
		return result;
	}

	is_same(other)
	{
		for (var i = 0; i < 64; i++)
		{
			if (this.pieces[i] != other.pieces[i] ||
				this.sides[i] != other.sides[i])
			{
				return false;
			}
		}
		return	this.enpassant_x == other.enpassant_x &&
				this.enpassant_y == other.enpassant_y &&
				this.castle_white_kingside === other.castle_white_kingside &&
				this.castle_white_queenside === other.castle_white_queenside &&
				this.castle_black_kingside === other.castle_black_kingside &&
				this.castle_black_queenside === other.castle_black_queenside;
	}

	reset()
	{
		this.activetimer = -1;
		this.whitetime_ms = this.timecontrol_initialms;
		this.blacktime_ms = this.timecontrol_initialms;
		for (var i = 0; i < 64; i++)
		{
			this.pieces[i] = -1;
			this.sides[i] = -1;
		}
		const layout = [PIECE_ROOK, PIECE_HORSEY, PIECE_BISHOP, PIECE_QUEEN, PIECE_KING, PIECE_BISHOP, PIECE_HORSEY, PIECE_ROOK];
		for (var i = 0; i < 8; i++)
		{
			this.pieces[this.get_index(i, 0)] = layout[i];
			this.pieces[this.get_index(i, 7)] = layout[i];
			this.pieces[this.get_index(i, 1)] = PIECE_PAWN;
			this.pieces[this.get_index(i, 6)] = PIECE_PAWN;
			this.sides[this.get_index(i, 0)] = SIDE_WHITE;
			this.sides[this.get_index(i, 7)] = SIDE_BLACK;
			this.sides[this.get_index(i, 1)] = SIDE_WHITE;
			this.sides[this.get_index(i, 6)] = SIDE_BLACK;
		}
		this.enpassant_x = -1;
		this.enpassant_y = -1;
		this.castle_white_kingside = true;
		this.castle_white_queenside = true;
		this.castle_black_kingside = true;
		this.castle_black_queenside = true;
		this.halfmoves = 0;
		this.fullmoves = 0;
		this.side_to_move = SIDE_WHITE;
		this.promotion_choice = PIECE_QUEEN;
		this.pgn = "";
	}

	get_index(x, y)
	{
		return x + y * 8;
	}

	get_piece(x, y)
	{
		if (x >= 0 && y >= 0 && x <= 7 && y <= 7)
		{
			return this.pieces[this.get_index(x, y)];
		}
		return -1;
	}

	get_side(x, y)
	{
		if (x >= 0 && y >= 0 && x <= 7 && y <= 7)
		{
			return this.sides[this.get_index(x, y)];
		}
		return -1;
	}

	test_piece_side(x, y, piece, side)
	{
		return this.get_piece(x, y) == piece && this.get_side(x, y) == side;
	}

	is_valid_square(x, y)
	{
		if (x >= 0 && y >= 0 && x <= 7 && y <= 7)
		{
			return true;
		}
		return false;
	}

	is_takeable(x, y, testside)
	{
		if (!this.is_valid_square(x, y))
		{
			return false;
		}
		if (this.get_piece(x, y) == -1)
		{
			return true;
		}
		return this.get_side(x, y) != testside;
	}

	append_pgn(x, y, dest_x, dest_y, p, castle_king, castle_queen, is_check, no_moves, capture, promote)
	{
		const pieces = ["", "N", "B", "R", "Q", "K"];
		var whitespace = 1;
		if (this.side_to_move == SIDE_BLACK)
		{
			this.pgn += (this.fullmoves + 1 + ".").padEnd(3, " ");
		}
		if (castle_king)
		{
			this.pgn += "O-O";
			whitespace ++;
		}
		else if (castle_queen)
		{
			this.pgn += "O-O-O";
		}
		else
		{
			this.pgn += pieces[p];
			if (capture)
			{
				if (pieces[p] == "")
				{
					this.pgn += encode_file(x);
				}
				this.pgn += "x";
			}
			else
			{
				whitespace ++;
				if (pieces[p] == "")
				{
					whitespace ++;
				}
			}
			this.pgn += encode_coordinates(dest_x, dest_y);
		}
		if (promote)
		{
			this.pgn += "=" + pieces[this.get_piece(dest_x, dest_y)];
		}
		else
		{
			whitespace += 2;
		}
		if (is_check)
		{
			if (no_moves)
			{
				this.pgn += "#";
			}
			else
			{
				this.pgn += "+"
			}
		}
		else
		{
			whitespace ++;
		}
		if (this.side_to_move == SIDE_BLACK)
		{
			this.pgn += " ".repeat(whitespace);
		}
		else
		{
			this.pgn += "\n";
		}
	}

	move_piece(x, y, dest_x, dest_y)
	{
		this.movehistory.push(this.copy());
		const p = this.get_piece(x, y);
		const s = this.get_side(x, y);
		var castle_king = false;
		var castle_queen = false;
		var is_check = false;
		var no_moves = false;
		var capture = false;
		var promote = false;

		if (s == SIDE_WHITE)
		{
			if (p == PIECE_KING)
			{
				this.castle_white_kingside = false;
				this.castle_white_queenside = false;
			}
			if (p == PIECE_ROOK && y == 0)
			{
				if (x == 0)
				{
					this.castle_white_queenside = false;
				}
				if (x == 7)
				{
					this.castle_white_kingside = false;
				}
			}
		}
		else
		{
			if (p == PIECE_KING)
			{
				this.castle_black_kingside = false;
				this.castle_black_queenside = false;
			}
			if (p == PIECE_ROOK && y == 7)
			{
				if (x == 0)
				{
					this.castle_black_queenside = false;
				}
				if (x == 7)
				{
					this.castle_black_kingside = false;
				}
			}
		}
		if (p == PIECE_PAWN)
		{
			if (dest_x == this.enpassant_x && dest_y == this.enpassant_y)
			{
				this.pieces[this.get_index(dest_x, dest_y+1)] = -1;
				this.sides[this.get_index(dest_x, dest_y+1)] = -1;
				this.pieces[this.get_index(dest_x, dest_y-1)] = -1;
				this.sides[this.get_index(dest_x, dest_y-1)] = -1;
				capture = true;
			}
		}
		this.enpassant_x = -1;
		this.enpassant_y = -1;
		if (p == PIECE_PAWN)
		{
			if (Math.abs(y - dest_y) == 2)
			{
				this.enpassant_x = x;
				this.enpassant_y = (y + dest_y) / 2;
			}
		}
		if (p == PIECE_PAWN || this.get_piece(dest_x, dest_y) != 0)
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
		this.side_to_move = 1-this.side_to_move;
		if (this.get_piece(dest_x, dest_y) != -1)
		{
			capture = true;
		}
		this.pieces[this.get_index(dest_x, dest_y)] = p;
		this.pieces[this.get_index(x, y)] = -1;
		this.sides[this.get_index(dest_x, dest_y)] = s;
		this.sides[this.get_index(x, y)] = -1;

		if (p == PIECE_PAWN && (
			(s == SIDE_WHITE && dest_y == 7) ||
			(s == SIDE_BLACK && dest_y == 0)))
		{
			this.pieces[this.get_index(dest_x, dest_y)] = this.promotion_choice;
			promote = true;
		}
		if (p == PIECE_KING &&
			Math.abs(x - dest_x) == 2)
		{
			if (dest_x == 2)
			{
				castle_queen = true;
				this.pieces[this.get_index(0, y)] = -1;
				this.sides[this.get_index(0, y)] = -1;
				this.pieces[this.get_index(3, y)] = PIECE_ROOK;
				this.sides[this.get_index(3, y)] = s;
			}
			else
			{
				castle_king = true;
				this.pieces[this.get_index(7, y)] = -1;
				this.sides[this.get_index(7, y)] = -1;
				this.pieces[this.get_index(5, y)] = PIECE_ROOK;
				this.sides[this.get_index(5, y)] = s;
			}
		}
		if (!this.is_copy)
		{
			is_check = this.test_king_check(this.side_to_move);
			no_moves = this.get_legal_move_count(this.side_to_move) == 0;
			this.append_pgn(x, y, dest_x, dest_y, p, castle_king, castle_queen, is_check, no_moves, capture, promote);
		}
		this.heartbeat();
		if (s == SIDE_WHITE)
		{
			this.whitetime_ms += this.timecontrol_addms;
		}
		else if (s == SIDE_BLACK)
		{
			this.blacktime_ms += this.timecontrol_addms;
		}
		this.activetimer = this.side_to_move;
	}

	get_king_square(side)
	{
		var x = -1;
		var y = -1;
		for (var i = 0; i < 8; i++)
		{
			for (var j = 0; j < 8; j++)
			{
				if (this.test_piece_side(i, j, PIECE_KING, side))
				{
					x = i;
					y = j;
					break;
				}
			}
		}
		return [x, y];
	}

	is_square_in_check(x, y, side)
	{
		if (side == SIDE_WHITE)
		{
			if (this.test_piece_side(x + 1, y + 1, PIECE_PAWN, SIDE_BLACK) ||
				this.test_piece_side(x - 1, y + 1, PIECE_PAWN, SIDE_BLACK))
			{
				return true;
			}
		}
		else
		{
			if (this.test_piece_side(x + 1, y - 1, PIECE_PAWN, SIDE_WHITE) ||
				this.test_piece_side(x - 1, y - 1, PIECE_PAWN, SIDE_WHITE))
			{
				return true;
			}
		}
		{
			const offsets = [[1, 1], [-1, -1], [-1, 1], [1, -1]];
			for (var i = 0; i < 4; i++)
			{
				for (var j = 1; j < 8; j++)
				{
					const p = this.get_piece(x + offsets[i][0] * j, y + offsets[i][1] * j);
					const s = this.get_side(x + offsets[i][0] * j, y + offsets[i][1] * j);
					if (s == side)
					{
						break;
					}
					if (s == 1-side)
					{
						if (p == PIECE_QUEEN ||
							p == PIECE_BISHOP)
						{
							return true;
						}
					}
				}
			}
		}
		{
			const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];
			for (var i = 0; i < 4; i++)
			{
				for (var j = 1; j < 8; j++)
				{
					const p = this.get_piece(x + offsets[i][0] * j, y + offsets[i][1] * j);
					const s = this.get_side(x + offsets[i][0] * j, y + offsets[i][1] * j);
					if (s == side)
					{
						break;
					}
					if (s == 1-side)
					{
						if (p == PIECE_QUEEN ||
							p == PIECE_ROOK)
						{
							return true;
						}
					}
				}
			}
		}
		{
			const offsets = [[1, 2], [-1, 2], [1, -2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]];
			for (var i = 0; i < 8; i++)
			{
				if (this.test_piece_side(x + offsets[i][0], y + offsets[i][1], PIECE_HORSEY, 1-side))
				{
					return true;
				}
			}
		}
		{
			const offsets = [[1, 1], [-1, -1], [-1, 1], [1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
			for (var i = 0; i < 8; i++)
			{
				if (this.test_piece_side(x + offsets[i][0], y + offsets[i][1], PIECE_KING, 1-side))
				{
					return true;
				}
			}
		}
		return false;
	}

	test_king_check(side)
	{
		var x = -1;
		var y = -1;
		[x, y] = this.get_king_square(side);
		if (x < 0)
		{
			return false;
		}
		return this.is_square_in_check(x, y, side);
	}

	get_legal_move_count(side)
	{
		var count = 0;
		for (var i = 0; i < 8; i++)
		{
			for (var j = 0; j < 8; j++)
			{
				if (this.get_side(i, j) == side)
				{
					count += this.get_legal_moves(i, j).length;
				}
			}
		}
		return count;
	}

	get_legal_moves(x, y)
	{
		var moves = new Array();
		const piece = this.get_piece(x, y);
		const side = this.get_side(x, y);
		if (piece == -1)
		{
			return [];
		}
		switch (piece)
		{
		case PIECE_PAWN:
			if (side == SIDE_WHITE &&
				this.get_piece(x, y + 1) == -1 &&
				this.is_valid_square(x, y + 1))
			{
				moves.push([x, y + 1]);
				if (this.get_piece(x, y + 2) == -1 &&
					y == 1)
				{
					moves.push([x, y + 2]);
				}
			}
			if (side == SIDE_WHITE)
			{
				if ((this.enpassant_x == x + 1 &&
					this.enpassant_y == y + 1 && 
					y == 4) ||
					this.get_side(x + 1, y + 1) == SIDE_BLACK)
				{
					moves.push([x + 1, y + 1]);
				}
				if ((this.enpassant_x == x - 1 &&
					this.enpassant_y == y + 1 &&
					y == 4) ||
					this.get_side(x - 1, y + 1) == SIDE_BLACK)
				{
					moves.push([x - 1, y + 1]);
				}
			}
			if (side == SIDE_BLACK &&
				this.get_piece(x, y - 1) == -1 &&
				this.is_valid_square(x, y - 1))
			{
				moves.push([x, y - 1]);
				if (this.get_piece(x, y - 2) == -1 &&
					y == 6)
				{
					moves.push([x, y - 2]);
				}
			}
			if (side == SIDE_BLACK)
			{
				if ((this.enpassant_x == x + 1 &&
					this.enpassant_y == y - 1 &&
					y == 3) ||
					this.get_side(x + 1, y - 1) == SIDE_WHITE)
				{
					moves.push([x + 1, y - 1]);
				}
				if ((this.enpassant_x == x - 1 &&
					this.enpassant_y == y - 1 &&
					y == 3) ||
					this.get_side(x - 1, y - 1) == SIDE_WHITE)
				{
					moves.push([x - 1, y - 1]);
				}
			}
			break;
		case PIECE_HORSEY:
		{
			const offsets = [[1, 2], [-1, 2], [1, -2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]];
			for (var j = 0; j < offsets.length; j++)
			{
				if (this.is_takeable(x + offsets[j][0], y + offsets[j][1], side))
				{
					moves.push([x + offsets[j][0], y + offsets[j][1]]);
				}
			}
		}
			break;
		case PIECE_BISHOP:
		{
			const offsets = [[1, 1], [-1, -1], [-1, 1], [1, -1]];
			for (var j = 0; j < 4; j++)
			{
				for (var k = 1; k < 8; k++)
				{
					const s = this.get_side(x + offsets[j][0] * k, y + offsets[j][1] * k);
					if (s != side &&
						this.is_valid_square(x + offsets[j][0] * k, y + offsets[j][1] * k))
					{
						moves.push([x + offsets[j][0] * k, y + offsets[j][1] * k]);
					}
					if (s != -1)
					{
						break;
					}
				}
			}
		}
			break;
		case PIECE_ROOK:
		{
			const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];
			for (var j = 0; j < 4; j++)
			{
				for (var k = 1; k < 8; k++)
				{
					const s = this.get_side(x + offsets[j][0] * k, y + offsets[j][1] * k);
					if (s != side && 
						this.is_valid_square(x + offsets[j][0] * k, y + offsets[j][1] * k))
					{
						moves.push([x + offsets[j][0] * k, y + offsets[j][1] * k]);
					}
					if (s != -1)
					{
						break;
					}
				}
			}
		}
			break;
		case PIECE_QUEEN:
		{
			const offsets = [[1, 1], [-1, -1], [-1, 1], [1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
			for (var j = 0; j < 8; j++)
			{
				for (var k = 1; k < 8; k++)
				{
					const s = this.get_side(x + offsets[j][0] * k, y + offsets[j][1] * k);
					if (s != side && 
						this.is_valid_square(x + offsets[j][0] * k, y + offsets[j][1] * k))
					{
						moves.push([x + offsets[j][0] * k, y + offsets[j][1] * k]);
					}
					if (s != -1)
					{
						break;
					}
				}
			}
		}
			break;
		case PIECE_KING:
		{
			const offsets = [[1, 1], [-1, -1], [-1, 1], [1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
			for (var j = 0; j < 8; j++)
			{
				if (this.get_side(x + offsets[j][0], y + offsets[j][1]) != side &&
					this.is_valid_square(x + offsets[j][0], y + offsets[j][1]))
				{
					moves.push([x + offsets[j][0], y + offsets[j][1]]);
				}
			}
			if (side == SIDE_WHITE)
			{
				if (this.castle_white_queenside &&
					x == 4 &&
					y == 0 &&
					this.test_piece_side(0, 0, PIECE_ROOK, SIDE_WHITE) &&
					this.get_side(1, 0) == -1 &&
					this.get_side(2, 0) == -1 &&
					this.get_side(3, 0) == -1 &&
					!this.is_square_in_check(2, 0, SIDE_WHITE) &&
					!this.is_square_in_check(3, 0, SIDE_WHITE) &&
					!this.is_square_in_check(4, 0, SIDE_WHITE))
				{
					moves.push([x - 2, y]);
				}
				if (this.castle_white_kingside &&
					x == 4 &&
					y == 0 &&
					this.test_piece_side(7, 0, PIECE_ROOK, SIDE_WHITE) &&
					this.get_side(5, 0) == -1 &&
					this.get_side(6, 0) == -1 &&
					!this.is_square_in_check(4, 0, SIDE_WHITE) &&
					!this.is_square_in_check(5, 0, SIDE_WHITE) &&
					!this.is_square_in_check(6, 0, SIDE_WHITE))
				{
					moves.push([x + 2, y]);
				}
			}
			else
			{
				if (this.castle_black_queenside &&
					x == 4 &&
					y == 7 &&
					this.test_piece_side(0, 7, PIECE_ROOK, SIDE_BLACK) &&
					this.get_side(1, 7) == -1 &&
					this.get_side(2, 7) == -1 &&
					this.get_side(3, 7) == -1 &&
					!this.is_square_in_check(2, 7, SIDE_BLACK) &&
					!this.is_square_in_check(3, 7, SIDE_BLACK) &&
					!this.is_square_in_check(4, 7, SIDE_BLACK))
				{
					moves.push([x - 2, y]);
				}
				if (this.castle_black_kingside &&
					x == 4 &&
					y == 7 &&
					this.test_piece_side(7, 7, PIECE_ROOK, SIDE_BLACK) &&
					this.get_side(5, 7) == -1 &&
					this.get_side(6, 7) == -1 &&
					!this.is_square_in_check(4, 7, SIDE_BLACK) &&
					!this.is_square_in_check(5, 7, SIDE_BLACK) &&
					!this.is_square_in_check(6, 7, SIDE_BLACK))
				{
					moves.push([x + 2, y]);
				}
			}
		}
			break;
		}
		var result = [];
		for (var i = 0; i < moves.length; i++)
		{
			var b = this.copy();
			b.move_piece(x, y, moves[i][0], moves[i][1]);
			if (!b.test_king_check(side))
			{
				result.push(moves[i]);
			}
		}
		return result;
	}

	compute_state()
	{
		if (this.side_to_move > 1)
		{
			return;
		}
		const legal = this.get_legal_move_count(this.side_to_move);
		const kingcheck = this.test_king_check(this.side_to_move);
		var repeat_count = 0;
		for (var i = 0; i < this.movehistory.length; i++)
		{
			if (this.is_same(this.movehistory[i]))
			{
				repeat_count ++;
			}
		}
		if (repeat_count >= 3)
		{
			this.side_to_move = GAMESTAT_DRAW_3FOLD;
			return;
		}
		if (this.halfmoves >= 50)
		{
			this.side_to_move = GAMESTAT_DRAW_50;
			return;
		}
		if (kingcheck)
		{
			if (legal == 0)
			{
				this.side_to_move = this.side_to_move == SIDE_WHITE ? 
					GAMESTAT_BLACK_WIN_CHECKMATE :
					GAMESTAT_WHITE_WIN_CHECKMATE;
				return;
			}
		}
		else
		{
			if (legal == 0)
			{
				this.side_to_move = this.side_to_move == SIDE_WHITE ? 
					GAMESTAT_DRAW_NOMOVES_WHITE :
					GAMESTAT_DRAW_NOMOVES_BLACK;
				return;
			}
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
				const p = this.get_piece(j, i);
				const s = this.get_side(j, i);
				if (p == -1)
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
					if (s == SIDE_WHITE)
					{
						fenstring += pieces_white[p];
					}
					else
					{
						fenstring += pieces_black[p];
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
		if (!this.castle_white_kingside &&
			!this.castle_white_queenside &&
			!this.castle_black_kingside &&
			!this.castle_black_queenside)
		{
			fenstring += "-";
		}
		else
		{
			if (this.castle_white_kingside)
			{
				fenstring += "K";
			}
			if (this.castle_white_queenside)
			{
				fenstring += "Q";
			}
			if (this.castle_black_kingside)
			{
				fenstring += "k";
			}
			if (this.castle_black_queenside)
			{
				fenstring += "q";
			}
		}
		fenstring += " ";
		if (this.enpassant_x == -1 &&
			this.enpassant_y == -1)
		{
			fenstring += "-";
		}
		else
		{
			fenstring += encode_coordinates(this.enpassant_x, this.enpassant_y);
		}
		fenstring += " " + this.halfmoves + " " + this.fullmoves;
		return fenstring;
	}

	heartbeat()
	{
		if (this.lastheartbeat == null)
		{
			this.lastheartbeat = (new Date()).getTime();
			return;
		}
		const delta = (new Date()).getTime() - this.lastheartbeat;
		this.lastheartbeat = (new Date()).getTime();
		if (this.activetimer == SIDE_WHITE)
		{
			this.whitetime_ms -= delta;
		}
		else if (this.activetimer == SIDE_BLACK)
		{
			this.blacktime_ms -= delta;
		}
		if (this.whitetime_ms < 0)
		{
			this.side_to_move = GAMESTAT_BLACK_WIN_TIME;
			this.whitetime_ms = 0;
			this.activetimer = -1;
			this.parent.update_board();
		}
		if (this.blacktime_ms < 0)
		{
			this.side_to_move = GAMESTAT_WHITE_WIN_TIME;
			this.blacktime_ms = 0;
			this.activetimer = -1;
			this.parent.update_board();
		}
	}
}

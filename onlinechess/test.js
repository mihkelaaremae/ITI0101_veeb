class LogicPiece
{

}

class LogicBoard
{

	constructor()
	{
		this.x = 0;
		this.y = 0;
		this.mis_poolel = new Array(64);
		this.mis_nupud = new Array(64);
		this.blabla = new LogicPiece();
		this.blabla[0] = {side:SIDE_WHTIE, piece:PIECE_PAWN};
	}

	get_square(x, y)
	{
		if (x >= 0 && x < 8 && y >= 0 && y < 8)
		{
			return this.blabla[];
		}
	}

	is_square_in_check(x, y)
	{

	}

	is_king_in_check()
	{

	}

	get_legal_moves(x, y)
	{
		return [[0, 2], [0, 3]]
	}

	set_side(side)
	{

	}
}

var a = new LogicBoard();
var b = new LogicBoard();

a.x = 5;
a.x != b.x;

a.get_legal_moves(4, 2);

get_legal_moves(0, 0);

function CPU(memory) {
	//Initialize the registers.
	this.A = 0x00;
	this.X = 0x00;
	this.Y = 0x00;

	//Initialize Memory
	this.memory = memory;

	//Initialize flags.
	this.C = false;
	this.Z = false;
	this.I = true;
	this.B = false;
	this.V = false;
	this.N = false;

	//Initialize Program Counter
	this.PC = (memory(0xFFFD) << 8) + memory(0xFFFC);

	//Initialize Stack Pointer
	this.SP = 0xFD;

	//How many cycles do we have to wait before executing the next instruction.
	this.wait = 0;


	//Clock the cpu.
	this.execute = function() {

		/* this.wait being equal to 0 means that the CPU is currently
		   available for fetching a new instruction.
		   Instructions on the 6502 can take anywhere from 2-7 cycles to
		   execute, depending on the addressing mode.
		   If the previous instruction is still being processed (i.e, this.wait > 0),
		   we just decrease the cycle counter (this.wait) and wait for the next CPU clock.
		   */

		if(this.wait === 0) {
			this[this.memory(this.PC)]();
		} else this.wait--;
	}

}

CPU.prototype = {

	//BRK
	0x00: function() {
		var C = this.C ? 1 : 0;
		var Z = this.Z ? 2 : 0 << 1;
		var I = this.I ? 4 : 0 << 2;
		var D = 0 << 3;
		var B = this.B ? 16 : 0 << 4;
		var not = 32;
		var V = this.V ? 64 : 0 << 6;
		var N = this.N ? 128 : 0 << 7;
		var status = C + Z + I + D + B + not + V + N;

		this.memory(0x0100 + this.SP, this.PC >> 8);
		this.memory((0x0100 + this.SP - 1) & 0xFF, this.PC & 0b0000000011111111);
		this.memory((0x0100 + this.SP - 2) & 0xFF, status);

		this.I = this.B = true;

		this.SP = (this.SP - 3) & 0xFF;

		this.PC = this.memory(0xFFFF) << 8 + this.memory(0xFFFE);

		this.wait = 6;
	},

	0x01: function() {
		this.Z = false;
		this.N = false;

		var address = (this.memory(this.PC + 1) + this.X) & 0xFF;
		var top = this.memory(address + 1);
		var bottom = this.memory(address);
		var value = (top << 8) + bottom;
		this.A = this.A | this.memory(value);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 5;
		this.PC += 2;
	},

	0x05: function() {
		this.Z = false;
		this.N = false;

		this.A = this.A | this.memory(this.memory(this.PC + 1));

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 2;
		this.PC += 2;
	},

	0x06: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		this.C = this.memory(this.memory(this.PC + 1)) >> 7 === 1 ? true : false;
		this.memory(this.memory(this.PC + 1), this.memory(this.memory(this.PC + 1)) << 1);

		if(this.memory(this.memory(this.PC + 1)) >> 7 === 1) this.N = true;
		if(this.memory(this.memory(this.PC + 1)) === 0) this.Z = true;

		this.PC += 2;
		this.wait = 4;
	},

	0x08: function() {
		this.B = true;

		var C = this.C ? 1 : 0;
		var Z = this.Z ? 2 : 0 << 1;
		var I = this.I ? 4 : 0 << 2;
		var D = 0 << 3;
		var B = this.B ? 16 : 0 << 4;
		var not = 32;
		var V = this.V ? 64 : 0 << 6;
		var N = this.N ? 128 : 0 << 7;

		var status = C + Z + I + D + B + not + V + N;
		this.memory(0x0100 + this.SP, status);
		if(this.SP > 0) this.SP--;
		else this.SP = 0xFF;

		this.PC++;
		this.wait = 2;
	},

	0x09: function() {
		this.Z = false;
		this.N = false;

		this.A = this.A | this.memory(this.PC + 1);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 1;
		this.PC += 2;
	},

	0x0A: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		this.C = this.A >> 7 === 1 ? true : false;
		this.A = this.A << 1;

		if(this.A >> 7 === 1) this.N = true;
		if(this.A === 0) this.Z = true;

		this.PC++;
		this.wait = 1;
	},

	0x0D: function() {
		this.Z = false;
		this.N = false;

		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		this.A = this.A | this.memory(address);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 3;
		this.PC += 3;
	},

	0x0E: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;

		this.C = this.memory(address) >> 7 === 1 ? true : false;
		this.memory(address, this.memory(address) << 1);

		if(this.memory(address) >> 7 === 1) this.N = true;
		if(this.memory(address) === 0) this.Z = true;

		this.PC += 3;
		this.wait = 5;
	},

	0x10: function() {
		if(!this.N) {
			var disp = this.memory(this.PC + 1) >= 0x80 ? this.memory(this.PC + 1) - 256 : this.memory(this.PC + 1);
			this.PC += 2;
			this.wait = this.PC & 0b0000000011111111 + this.memory(this.PC + 1) > 255 ? 4 : 3;
			this.PC += disp;
		} else this.wait = 2;
	},

	0x11: function() {
		this.Z = false;
		this.N = false;

		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;
		this.A = this.A | this.memory(address + this.Y);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		if(this.Y + bottom > 255) this.wait = 5;
		else this.wait = 4;

		this.PC += 2;
	},

	0x15: function() {
		this.Z = false;
		this.N = false;

		this.A = this.A | this.memory((this.memory(this.PC + 1) + this.X) & 0xFF);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 3;
		this.PC += 2;
	},

	0x16: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		this.C = this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) >> 7 === 1 ? true : false;
		this.memory((this.memory(this.PC + 1) + this.X) & 0xFF, this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) << 1);

		if(this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) >> 7 === 1) this.N = true;
		if(this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) === 0) this.Z = true;

		this.PC += 2;
		this.wait = 5;
	},

	0x18: function() {
		this.C = false;
		this.PC++;
		this.wait = 1;
	},

	0x19: function() {
		this.Z = false;
		this.N = false;

		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		this.A = this.A | this.memory(address + this.Y);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		if(this.X + bottom > 255) this.wait = 4;
		else this.wait = 3;

		this.PC += 3;
	},

	0x1D: function() {
		this.Z = false;
		this.N = false;

		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		this.A = this.A | this.memory(address + this.X);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		if(this.X + bottom > 255) this.wait = 4;
		else this.wait = 3;

		this.PC += 3;
	},

	0x1E: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;

		this.C = this.memory(address + this.X) >> 7 === 1 ? true : false;
		this.memory(address + this.X, this.memory(address + this.X) << 1);

		if(this.memory(address + this.X) >> 7 === 1) this.N = true;
		if(this.memory(address + this.X) === 0) this.Z = true;

		this.PC += 3;
		this.wait = 6;
	},

	0x21: function() {
		this.Z = false;
		this.N = false;

		var address = (this.memory(this.PC + 1) + this.X) & 0xFF;
		var top = this.memory(address + 1);
		var bottom = this.memory(address);
		var value = (top << 8) + bottom;
		this.A = this.A & this.memory(value);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 5;
		this.PC += 2;
	},

	0x24: function() {
		this.Z = false;
		this.V = false;
		this.N = false;

		var ANDed = this.A & this.memory(this.memory(this.PC + 1));
		if(ANDed === 0) this.Z = true;

		this.N = this.memory(this.memory(this.PC + 1)) >> 7 === 1 ? true : false;
		this.V = this.memory(this.memory(this.PC + 1)) & 0b01000000 === 64 ? true : false;

		this.PC += 2;
		this.wait = 2;
	},

	0x25: function() {
		this.Z = false;
		this.N = false;

		this.A = this.A & this.memory(this.memory(this.PC + 1));

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 2;
		this.PC += 2;
	},

	0x26: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		var carry = this.C ? 1 : 0;

		this.C = this.memory(this.memory(this.PC + 1)) >> 7 === 1 ? true : false;
		this.memory(this.memory(this.PC + 1), this.memory(this.memory(this.PC + 1)) << 1 | carry);

		if(this.memory(this.memory(this.PC + 1)) >> 7 === 1) this.N = true;
		if(this.memory(this.memory(this.PC + 1)) === 0) this.Z = true;

		this.PC += 2;
		this.wait = 4;
	},

	0x28: function() {
		var newStatus = this.memory(0x0100 + this.SP);

		this.C = newStatus & 0b00000001 === 1 ? true : false;
		this.Z = newStatus & 0b00000010 === 2 ? true : false;
		this.I = newStatus & 0b00000100 === 4 ? true : false;
		this.B = newStatus & 0b00010000 === 16 ? true : false;
		this.V = newStatus & 0b01000000 === 64 ? true : false;
		this.N = newStatus & 0b10000000 === 128 ? true : false;

		if(this.SP < 0xFF) this.SP++;
		else this.SP = 0x00;

		this.PC++;
		this.wait = 3;
	},

	0x29: function() {
		this.Z = false;
		this.N = false;

		this.A = this.A & this.memory(this.PC + 1);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 1;
		this.PC += 2;
	},

	0x2A: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		var carry = this.C ? 1 : 0;

		this.C = this.A >> 7 === 1 ? true : false;
		this.A = this.A << 1 | carry;

		if(this.A >> 7 === 1) this.N = true;
		if(this.A === 0) this.Z = true;

		this.PC++;
		this.wait = 1;
	},

	0x2C: function() {
		this.Z = false;
		this.V = false;
		this.N = false;

		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;
		var value = this.memory(address);

		var ANDed = this.A & value;
		if(ANDed === 0) this.Z = true;

		this.N = value >> 7 === 1 ? true : false;
		this.V = value & 0b01000000 === 64 ? true : false;

		this.PC += 2;
		this.wait = 3;
	},

	0x2D: function() {
		this.Z = false;
		this.N = false;

		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		this.A = this.A & this.memory(address);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 3;
		this.PC += 3;
	},

	0x2E: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		var carry = this.C ? 1 : 0;

		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;

		this.C = this.memory(address) >> 7 === 1 ? true : false;
		this.memory(address, this.memory(address) << 1 | carry);

		if(this.memory(address) >> 7 === 1) this.N = true;
		if(this.memory(address) = 0) this.Z = true;

		this.PC += 3;
		this.wait = 5;
	},

	0x30: function() {
		if(this.N) {
			var disp = this.memory(this.PC + 1) >= 0x80 ? this.memory(this.PC + 1) - 256 : this.memory(this.PC + 1);
			this.PC += 2;
			this.wait = this.PC & 0b0000000011111111 + this.memory(this.PC + 1) > 255 ? 4 : 3;
			this.PC += disp;
		} else this.wait = 2;
	},

	0x31: function() {
		this.Z = false;
		this.N = false;

		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;
		this.A = this.A & this.memory(address + this.Y);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		if(this.Y + bottom > 255) this.wait = 5;
		else this.wait = 4;

		this.PC += 2;
	},

	0x35: function() {
		this.Z = false;
		this.N = false;

		this.A = this.A & this.memory((this.memory(this.PC + 1) + this.X) & 0xFF);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 3;
		this.PC += 2;
	},

	0x36: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		var carry = this.C ? 1 : 0;

		this.C = this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) >> 7 === 1 ? true : false;
		this.memory((this.memory(this.PC + 1) + this.X) & 0xFF, this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) << 1 | carry);

		if(this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) >> 7 === 1) this.N = true;
		if(this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) === 0) this.Z = true;

		this.PC += 2;
		this.wait = 5;
	},

	0x38: function() {
		this.C = true;
		this.PC++;
		this.wait = 1;
	},

	0x39: function() {
		this.Z = false;
		this.N = false;

		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		this.A = this.A & this.memory(address + this.Y);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		if(this.X + bottom > 255) this.wait = 4;
		else this.wait = 3;

		this.PC += 3;
	},

	0x3D: function() {
		this.Z = false;
		this.N = false;

		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		this.A = this.A & this.memory(address + this.X);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		if(this.X + bottom > 255) this.wait = 4;
		else this.wait = 3;

		this.PC += 3;
	},

	0x3E: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		var carry = this.C ? 1 : 0;

		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;

		this.C = this.memory(address + this.X) >> 7 === 1 ? true : false;
		this.memory(address + this.X, this.memory(address + this.X) << 1 | carry);

		if(this.memory(address + this.X) >> 7 === 1) this.N = true;
		if(this.memory(address + this.X) === 0) this.Z = true;

		this.PC += 3;
		this.wait = 6;
	},

	0x40: function() {
		var newStatus = this.memory(0x0100 + this.SP + 1);

		this.C = newStatus & 0b00000001 === 1 ? true : false;
		this.Z = newStatus & 0b00000010 === 2 ? true : false;
		this.I = newStatus & 0b00000100 === 4 ? true : false;
		this.B = newStatus & 0b00010000 === 16 ? true : false;
		this.V = newStatus & 0b01000000 === 64 ? true : false;
		this.N = newStatus & 0b10000000 === 128 ? true : false;

		this.PC = this.memory(0x0100 + this.SP + 3) << 8 + this.memory(0x0100 + this.SP + 2);

		this.SP += 3;

		this.wait = 5;
	},

	0x41: function() {
		this.Z = false;
		this.N = false;

		var address = (this.memory(this.PC + 1) + this.X) & 0xFF;
		var top = this.memory(address + 1);
		var bottom = this.memory(address);
		var value = (top << 8) + bottom;
		this.A = this.A ^ this.memory(value);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 5;
		this.PC += 2;
	},

	0x45: function() {
		this.Z = false;
		this.N = false;

		this.A = this.A ^ this.memory(this.memory(this.PC + 1));

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 2;
		this.PC += 2;
	},

	0x46: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		this.C = this.memory(this.memory(this.PC + 1)) & 0b00000001 === 1 ? true : false;
		this.memory(this.memory(this.PC + 1), this.memory(this.memory(this.PC + 1)) >> 1);

		if(this.memory(this.memory(this.PC + 1)) >> 7 === 1) this.N = true;
		if(this.memory(this.memory(this.PC + 1)) === 0) this.Z = true;

		this.PC += 2;
		this.wait = 4;
	},

	0x48: function() {
		this.memory(0x0100 + this.SP, this.A);
		if(this.SP > 0) this.SP--;
		else this.SP = 0xFF;

		this.PC++;
		this.wait = 2;
	},

	0x49: function() {
		this.Z = false;
		this.N = false;

		this.A = this.A ^ this.memory(this.PC + 1);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 1;
		this.PC += 2;
	},

	0x4A: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		this.C = this.A & 0b00000001 === 1 ? true : false;
		this.A = this.A >> 1;

		if(this.A >> 7 === 1) this.N = true;
		if(this.A === 0) this.Z = true;

		this.PC++;
		this.wait = 1;
	},

	0x4D: function() {
		this.Z = false;
		this.N = false;

		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		this.A = this.A ^ this.memory(address);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 3;
		this.PC += 3;
	},

	0x4E: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;

		this.C = this.memory(address) & 0b00000001 === 1 ? true : false;
		this.memory(address, this.memory(address) >> 1);

		if(this.memory(address) >> 7 === 1) this.N = true;
		if(this.memory(address) = 0) this.Z = true;

		this.PC += 3;
		this.wait = 5;
	},

	0x50: function() {
		if(!this.V) {
			var disp = this.memory(this.PC + 1) >= 0x80 ? this.memory(this.PC + 1) - 256 : this.memory(this.PC + 1);
			this.PC += 2;
			this.wait = this.PC & 0b0000000011111111 + this.memory(this.PC + 1) > 255 ? 4 : 3;
			this.PC += disp;
		} else this.wait = 2;
	},

	0x51: function() {
		this.Z = false;
		this.N = false;

		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;
		this.A = this.A ^ this.memory(address + this.Y);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		if(this.Y + bottom > 255) this.wait = 5;
		else this.wait = 4;

		this.PC += 2;
	},

	0x55: function() {
		this.Z = false;
		this.N = false;

		this.A = this.A ^ this.memory((this.memory(this.PC + 1) + this.X) & 0xFF);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 3;
		this.PC += 2;
	},

	0x56: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		this.C = this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) & 0b00000001 === 1 ? true : false;
		this.memory((this.memory(this.PC + 1) + this.X) & 0xFF, this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) >> 1);

		if(this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) >> 7 === 1) this.N = true;
		if(this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) === 0) this.Z = true;

		this.PC += 2;
		this.wait = 5;
	},

	0x58: function() {
		this.I = false;
		this.PC++;
		this.wait = 1;
	},

	0x59: function() {
		this.Z = false;
		this.N = false;

		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		this.A = this.A ^ this.memory(address + this.Y);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		if(this.X + bottom > 255) this.wait = 4;
		else this.wait = 3;

		this.PC += 3;
	},

	0x5D: function() {
		this.Z = false;
		this.N = false;

		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		this.A = this.A ^ this.memory(address + this.X);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		if(this.X + bottom > 255) this.wait = 4;
		else this.wait = 3;

		this.PC += 3;
	},

	0x5E: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;

		this.C = this.memory(address + this.X) & 0b00000001 === 1 ? true : false;
		this.memory(address + this.X, this.memory(address + this.X) >> 1);

		if(this.memory(address + this.X) >> 7 === 1) this.N = true;
		if(this.memory(address + this.X) === 0) this.Z = true;

		this.PC += 3;
		this.wait = 6;
	},

	0x61: function() {
		this.Z = false;
		this.N = false;
		this.C = false;
		this.V = false;

		var address = (this.memory(this.PC + 1) + this.X) & 0xFF;
		var top = this.memory(address + 1);
		var bottom = this.memory(address);
		var value = (top << 8) + bottom;

		var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
		var parNeg = this.memory(value) >= 0x80 ? this.memory(value) - 256 : this.memory(value);
		this.V = aNeg + parNeg < -128 | aNeg + parNeg > 127 ? true : false;

		this.A = (this.A + this.memory(value)) & 0xFF;

		if((this.A + this.memory(value)) & 0xFF > 255) this.C = true;
		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 5;
		this.PC += 2;
	},

	0x65: function() {
		this.Z = false;
		this.N = false;
		this.C = false;
		this.V = false;

		var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
		var parNeg = this.memory(this.memory(this.PC + 1)) >= 0x80 ? this.memory(this.memory(this.PC + 1)) - 256 : this.memory(this.memory(this.PC + 1));
		this.V = aNeg + parNeg < -128 | aNeg + parNeg > 127 ? true : false;

		this.A = (this.A + this.memory(this.memory(this.PC + 1))) & 0xFF;

		if(this.A + this.memory(this.memory(this.PC + 1)) > 255) this.C = true;
		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 2;
		this.PC += 2;
	},

	0x66: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		var carry = this.C ? 0b10000000 : 0;

		this.C = this.memory(this.memory(this.PC + 1)) & 0b00000001 === 1 ? true : false;
		this.memory(this.memory(this.PC + 1), this.memory(this.memory(this.PC + 1)) >> 1 | carry);

		if(this.memory(this.memory(this.PC + 1)) >> 7 === 1) this.N = true;
		if(this.memory(this.memory(this.PC + 1)) === 0) this.Z = true;

		this.PC += 2;
		this.wait = 4;
	},

	0x68: function() {
		this.Z = false;
		this.N = false;

		this.A = this.memory(0x0100 + this.SP);

		if(this.SP < 0xFF) this.SP++;
		else this.SP = 0x00;

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.PC++;
		this.wait = 3;
	},

	0x69: function() {
		this.Z = false;
		this.N = false;
		this.C = false;
		this.V = false;

		var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
		var parNeg = this.memory(this.PC + 1) >= 0x80 ? this.memory(this.PC + 1) - 256 : this.memory(this.PC + 1);
		this.V = aNeg + parNeg < -128 | aNeg + parNeg > 127 ? true : false;

		this.A = (this.A + this.memory(this.PC + 1)) & 0xFF;

		if(this.A + this.memory(this.PC + 1) > 255) this.C = true;
		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 1;
		this.PC += 2;
	},

	0x6A: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		var carry = this.C ? 0b10000000 : 0;

		this.C = this.A & 0b00000001 === 1 ? true : false;
		this.A = this.A >> 1 | carry;

		if(this.A >> 7 === 1) this.N = true;
		if(this.A === 0) this.Z = true;

		this.PC++;
		this.wait = 1;
	},

	0x6D: function() {
		this.Z = false;
		this.N = false;
		this.C = false;
		this.V = false;

		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
		var parNeg = this.memory(address) >= 0x80 ? this.memory(address) - 256 : this.memory(address);
		this.V = aNeg + parNeg < -128 | aNeg + parNeg > 127 ? true : false;

		this.A = (this.A + this.memory(address)) & 0xFF;

		if((this.A + this.memory(address)) & 0xFF > 255) this.C = true;
		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 3;
		this.PC += 3;
	},

	0x6E: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		var carry = this.C ? 0b10000000 : 0;

		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;

		this.C = this.memory(address) & 0b00000001 === 1 ? true : false;
		this.memory(address, this.memory(address) >> 1 | carry);

		if(this.memory(address) >> 7 === 1) this.N = true;
		if(this.memory(address) = 0) this.Z = true;

		this.PC += 3;
		this.wait = 5;
	},

	0x70: function() {
		if(this.V) {
			var disp = this.memory(this.PC + 1) >= 0x80 ? this.memory(this.PC + 1) - 256 : this.memory(this.PC + 1);
			this.PC += 2;
			this.wait = this.PC & 0b0000000011111111 + this.memory(this.PC + 1) > 255 ? 4 : 3;
			this.PC += disp;
		} else this.wait = 2;
	},

	0x71: function() {
		this.Z = false;
		this.N = false;
		this.C = false;
		this.V = false;

		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;

		var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
		var parNeg = this.memory(address + this.Y) >= 0x80 ? this.memory(address + this.Y) - 256 : this.memory(address + this.Y);
		this.V = aNeg + parNeg < -128 | aNeg + parNeg > 127 ? true : false;

		this.A = (this.A + this.memory(address + this.Y)) & 0xFF;

		if((this.A + this.memory(address + this.Y)) & 0xff > 255) this.C = true;
		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		if(this.Y + bottom > 255) this.wait = 5;
		else this.wait = 4;

		this.PC += 2;
	},

	0x75: function() {
		this.Z = false;
		this.N = false;
		this.C = false;
		this.V = false;

		var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
		var parNeg = this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) >= 0x80 ? this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) - 256 : this.memory((this.memory(this.PC + 1) + this.X) & 0xFF);
		this.V = aNeg + parNeg < -128 | aNeg + parNeg > 127 ? true : false;

		this.A = (this.A + this.memory((this.memory(this.PC + 1) + this.X) & 0xFF)) & 0xFF;

		if(this.A + this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) > 255) this.C = true;
		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 3;
		this.PC += 2;
	},

	0x76: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		var carry = this.C ? 0b10000000 : 0;

		this.C = this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) & 0b00000001 === 1 ? true : false;
		this.memory((this.memory(this.PC + 1) + this.X) & 0xFF, this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) >> 1 | carry);

		if(this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) >> 7 === 1) this.N = true;
		if(this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) === 0) this.Z = true;

		this.PC += 2;
		this.wait = 5;
	},

	0x78: function() {
		this.I = true;
		this.PC++;
		this.wait = 1;
	},

	0x79: function() {
		this.Z = false;
		this.N = false;
		this.C = false;
		this.V = false;

		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
		var parNeg = this.memory(address + this.Y) >= 0x80 ? this.memory(address + this.Y) - 256 : this.memory(address + this.Y);
		this.V = aNeg + parNeg < -128 | aNeg + parNeg > 127 ? true : false;

		this.A = (this.A + this.memory(address + this.Y)) & 0xFF;

		if((this.A + this.memory(address + this.Y)) & 0xFF > 255) this.C = true;
		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		if(this.X + bottom > 255) this.wait = 4;
		else this.wait = 3;

		this.PC += 3;
	},

	0x7D: function() {
		this.Z = false;
		this.N = false;
		this.C = false;
		this.V = false;

		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
		var parNeg = this.memory(address + this.X) >= 0x80 ? this.memory(address + this.X) - 256 : this.memory(address + this.X);
		this.V = aNeg + parNeg < -128 | aNeg + parNeg > 127 ? true : false;

		this.A = (this.A + this.memory(address + this.X)) & 0xFF;

		if(this.A + this.memory(address + this.X) > 255) this.C = true;
		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		if(this.X + bottom > 255) this.wait = 4;
		else this.wait = 3;

		this.PC += 3;
	},

	0x7E: function() {
		this.C = false;
		this.Z = false;
		this.N = false;

		var carry = this.C ? 0b10000000 : 0;

		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;

		this.C = this.memory(address + this.X) & 0b00000001 === 1 ? true : false;
		this.memory(address + this.X, this.memory(address + this.X) >> 1 | carry);

		if(this.memory(address + this.X) >> 7 === 1) this.N = true;
		if(this.memory(address + this.X) === 0) this.Z = true;

		this.PC += 3;
		this.wait = 6;
	},

	0x84: function() {
		this.memory(this.PC + 1, this.Y);

		this.PC += 2;
		this.wait = 2;
	},

	0x88: function() {
		this.Z = false;
		this.N = false;

		this.Y = (this.Y - 1) & 0xFF;

		if(this.Y === 0) this.Z = true;
		if(this.Y >> 7 === 1) this.N = true;

		this.PC++;
		this.wait = 1;
	},

	0x8A: function() {
		this.Z = false;
		this.N = false;

		this.A = this.X;

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.PC++;
		this.wait = 1;
	},

	0x8C: function() {
		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		this.memory(address, this.Y);

		this.wait = 3;
		this.PC += 3;
	},

	0x90: function() {
		if(!this.C) {
			var disp = this.memory(this.PC + 1) >= 0x80 ? this.memory(this.PC + 1) - 256 : this.memory(this.PC + 1);
			this.PC += 2;
			this.wait = this.PC & 0b0000000011111111 + this.memory(this.PC + 1) > 255 ? 4 : 3;
			this.PC += disp;
		} else this.wait = 2;
	},

	0x94: function() {
		this.memory(((this.memory(this.PC + 1) + this.X) & 0xFF), this.Y);

		this.wait = 3;
		this.PC += 2;
	},

	0x98: function() {
		this.Z = false;
		this.N = false;

		this.A = this.Y;

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.PC++;
		this.wait = 1;
	},

	0x9A: function() {
		this.SP = this.X;

		this.PC++;
		this.wait = 1;
	},

	0xA8: function() {
		this.Z = false;
		this.N = false;

		this.Y = this.A;

		if(this.Y === 0) this.Z = true;
		if(this.Y >> 7 === 1) this.N = true;

		this.PC++;
		this.wait = 1;
	},

	0xAA: function() {
		this.Z = false;
		this.N = false;

		this.X = this.A;

		if(this.X === 0) this.Z = true;
		if(this.X >> 7 === 1) this.N = true;

		this.PC++;
		this.wait = 1;
	},

	0xAD: function() {
		this.Z = false;
		this.N = false;

		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		this.A = this.memory(address);

		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 3;
		this.PC += 3;
	},

	0xB0: function() {
		if(this.C) {
			var disp = this.memory(this.PC + 1) >= 0x80 ? this.memory(this.PC + 1) - 256 : this.memory(this.PC + 1);
			this.PC += 2;
			this.wait = this.PC & 0b0000000011111111 + this.memory(this.PC + 1) > 255 ? 4 : 3;
			this.PC += disp;
		} else this.wait = 2;
	},

	0xB8: function() {
		this.V = false;
		this.PC++;
		this.wait = 1;
	},

	0xBA: function() {
		this.Z = false;
		this.N = false;

		this.X = this.SP;

		if(this.X === 0) this.Z = true;
		if(this.X >> 7 === 1) this.N = true;

		this.PC++;
		this.wait = 1;
	},

	0xC0: function() {
		this.C = this.Y >= this.memory(this.PC + 1) ? true : false;
		this.Z = this.Y === this.memory(this.PC + 1) ? true : false;
		this.N = (this.Y - this.memory(this.PC + 1)) >> 7 === 1 ? true : false;

		this.PC += 2;
		this.wait = 1;
	},

	0xC1: function() {
		var address = (this.memory(this.PC + 1) + this.X) & 0xFF;
		var top = this.memory(address + 1);
		var bottom = this.memory(address);
		var value = (top << 8) + bottom;

		this.C = this.A >= this.memory(value) ? true : false;
		this.Z = this.A === this.memory(value) ? true : false;
		this.N = (this.A - this.memory(value)) >> 7 === 1 ? true : false;

		this.wait = 5;
		this.PC += 2;
	},

	0xC4: function() {
		this.C = this.Y >= this.memory(this.memory(this.PC + 1)) ? true : false;
		this.Z = this.Y === this.memory(this.memory(this.PC + 1)) ? true : false;
		this.N = (this.Y - this.memory(this.memory(this.PC + 1))) >> 7 === 1 ? true : false;

		this.PC += 2;
		this.wait = 2;
	},

	0xC5: function() {
		this.C = this.A >= this.memory(this.memory(this.PC + 1)) ? true : false;
		this.Z = this.A === this.memory(this.memory(this.PC + 1)) ? true : false;
		this.N = (this.A - this.memory(this.memory(this.PC + 1))) >> 7 === 1 ? true : false;

		this.wait = 2;
		this.PC += 2;
	},

	0xC6: function() {
		this.Z = false;
		this.N = false;

		this.memory(this.memory(PC + 1), (this.memory(this.memory(PC + 1)) - 1) && 0xFF);

		if(this.memory(this.memory(PC + 1)) === 0) this.Z = true;
		if(this.memory(this.memory(PC + 1)) >> 7 === 1) this.N = true;

		this.PC += 2;
		this.wait = 4;
	},

	0xC8: function() {
		this.Z = false;
		this.N = false;

		this.Y = (this.Y + 1) & 0xFF;

		if(this.Y === 0) this.Z = true;
		if(this.Y >> 7 === 1) this.N = true;

		this.PC++;
		this.wait = 1;
	},

	0xC9: function() {
		this.C = this.A >= this.memory(this.PC + 1) ? true : false;
		this.Z = this.A === this.memory(this.PC + 1) ? true : false;
		this.N = (this.A - this.memory(this.PC + 1)) >> 7 === 1 ? true : false;

		this.wait = 1;
		this.PC += 2;
	},

	0xCA: function() {
		this.Z = false;
		this.N = false;

		this.X = (this.X - 1) & 0xFF;

		if(this.X === 0) this.Z = true;
		if(this.X >> 7 === 1) this.N = true;

		this.PC++;
		this.wait = 1;
	},

	0xCC: function() {
		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;

		this.C = this.Y >= this.memory(address) ? true : false;
		this.Z = this.Y === this.memory(address) ? true : false;
		this.N = (this.Y - this.memory(address)) >> 7 === 1 ? true : false;

		this.PC += 3;
		this.wait = 3;
	},

	0xCD: function() {
		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		this.C = this.A >= this.memory(address) ? true : false;
		this.Z = this.A === this.memory(address) ? true : false;
		this.N = (this.A - this.memory(address)) >> 7 === 1 ? true : false;

		this.wait = 3;
		this.PC += 3;
	},

	0xCE: function() {
		this.Z = false;
		this.N = false;

		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;

		this.memory(address, (this.memory(address) - 1) && 0xFF);

		if(this.memory(address) === 0) this.Z = true;
		if(this.memory(address) >> 7 === 1) this.N = true;

		this.PC++;
		this.wait = 5;
	},

	0xD0: function() {
		if(!this.Z) {
			var disp = this.memory(this.PC + 1) >= 0x80 ? this.memory(this.PC + 1) - 256 : this.memory(this.PC + 1);
			this.PC += 2;
			this.wait = this.PC & 0b0000000011111111 + this.memory(this.PC + 1) > 255 ? 4 : 3;
			this.PC += disp;
		} else this.wait = 2;
	},

	0xD1: function() {
		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;

		this.C = this.A >= this.memory(address + this.Y) ? true : false;
		this.Z = this.A === this.memory(address + this.Y) ? true : false;
		this.N = (this.A - this.memory(address + this.Y)) >> 7 === 1 ? true : false;

		if(this.Y + bottom > 255) this.wait = 5;
		else this.wait = 4;

		this.PC += 2;
	},

	0xD5: function() {
		this.C = this.A >= (this.memory(this.memory(this.PC + 1)) + this.X) & 0xFF ? true : false;
		this.Z = this.A === this.memory((this.memory(this.PC + 1) + this.X)) & 0xFF ? true : false;
		this.N = (this.A - this.memory((this.memory(this.PC + 1) + this.X)) & 0xFF) >> 7 === 1 ? true : false;

		this.wait = 3;
		this.PC += 2;
	},

	0xD6: function() {
		this.Z = false;
		this.N = false;

		this.memory((this.memory(PC + 1) + this.X & 0xFF), ((this.memory(this.memory(PC + 1) + this.X) & 0xFF) - 1) && 0xFF);

		if((this.memory((this.memory(PC + 1) + this.X & 0xFF))) === 0) this.Z = true;
		if((this.memory((this.memory(PC + 1) + this.X & 0xFF))) >> 7 === 1) this.N = true;

		this.PC++;
		this.wait = 5;
	},

	0xD8: function() {
		this.PC++;
		this.wait = 1;
	},

	0xD9: function() {
		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		this.C = this.A >= this.memory(address + this.Y) ? true : false;
		this.Z = this.A === this.memory(address + this.Y) ? true : false;
		this.N = (this.A - this.memory(address + this.Y)) >> 7 === 1 ? true : false;

		if(this.X + bottom > 255) this.wait = 4;
		else this.wait = 3;

		this.PC += 3;
	},

	0xDD: function() {
		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		this.C = this.A >= this.memory(address + this.X) ? true : false;
		this.Z = this.A === this.memory(address + this.X) ? true : false;
		this.N = (this.A - this.memory(address + this.X)) >> 7 === 1 ? true : false;

		if(this.X + bottom > 255) this.wait = 4;
		else this.wait = 3;

		this.PC += 3;
	},

	0xDE: function() {
		this.Z = false;
		this.N = false;

		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;

		this.memory(address + this.X, (this.memory(address + this.X) - 1) && 0xFF);

		if(this.memory(address + this.X) === 0) this.Z = true;
		if(this.memory(address + this.X) >> 7 === 1) this.N = true;

		this.PC++;
		this.wait = 6;
	},

	0xE0: function() {
		this.C = this.X >= this.memory(this.PC + 1) ? true : false;
		this.Z = this.X === this.memory(this.PC + 1) ? true : false;
		this.N = (this.X - this.memory(this.PC + 1)) >> 7 === 1 ? true : false;

		this.PC += 2;
		this.wait = 1;
	},

	0xE1: function() {
		this.Z = false;
		this.N = false;
		this.C = true;
		this.V = false;

		var address = (this.memory(this.PC + 1) + this.X) & 0xFF;
		var top = this.memory(address + 1);
		var bottom = this.memory(address);
		var value = (top << 8) + bottom;

		var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
		var parNeg = this.memory(value) >= 0x80 ? this.memory(value) - 256 : this.memory(value);
		this.V = aNeg - parNeg < -128 | aNeg + parNeg > 127 ? true : false;

		this.A = (this.A - this.memory(value)) & 0xFF;

		if((this.A - this.memory(value)) & 0xFF < 0) this.C = true;
		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 5;
		this.PC += 2;
	},

	0xE4: function() {
		this.C = this.X >= this.memory(this.memory(this.PC + 1)) ? true : false;
		this.Z = this.X === this.memory(this.memory(this.PC + 1)) ? true : false;
		this.N = (this.X - this.memory(this.memory(this.PC + 1))) >> 7 === 1 ? true : false;

		this.PC += 2;
		this.wait = 2;
	},

	0xE5: function() {
		this.Z = false;
		this.N = false;
		this.C = true;
		this.V = false;

		var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
		var parNeg = this.memory(this.memory(this.PC + 1)) >= 0x80 ? this.memory(this.memory(this.PC + 1)) - 256 : this.memory(this.memory(this.PC + 1));
		this.V = aNeg - parNeg < -128 | aNeg + parNeg > 127 ? true : false;

		this.A = (this.A - this.memory(this.memory(this.PC + 1))) & 0xFF;

		if(this.A - this.memory(this.memory(this.PC + 1)) < 0) this.C = true;
		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 2;
		this.PC += 2;
	},

	0xE6: function() {
		this.Z = false;
		this.N = false;

		this.memory(this.memory(PC + 1), (this.memory(this.memory(PC + 1)) + 1) && 0xFF);

		if(this.memory(this.memory(PC + 1)) === 0) this.Z = true;
		if(this.memory(this.memory(PC + 1)) >> 7 === 1) this.N = true;

		this.PC += 2;
		this.wait = 4;
	},

	0xE8: function() {
		this.Z = false;
		this.N = false;

		this.X = (this.X + 1) & 0xFF;

		if(this.X === 0) this.Z = true;
		if(this.X >> 7 === 1) this.N = true;

		this.PC++;
		this.wait = 1;
	},

	0xE9: function() {
		this.Z = false;
		this.N = false;
		this.C = true;
		this.V = false;

		var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
		var parNeg = this.memory(this.PC + 1) >= 0x80 ? this.memory(this.PC + 1) - 256 : this.memory(this.PC + 1);
		this.V = aNeg - parNeg < -128 | aNeg - parNeg > 127 ? true : false;

		this.A = (this.A - this.memory(this.PC + 1)) & 0xFF;

		if(this.A - this.memory(this.PC + 1) < 0) this.C = true;
		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 1;
		this.PC += 2;
	},

	0xEA: function() {
		this.PC++;
		this.wait = 1
	},

	0xEC: function() {
		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;

		this.C = this.X >= this.memory(address) ? true : false;
		this.Z = this.X === this.memory(address) ? true : false;
		this.N = (this.X - this.memory(address)) >> 7 === 1 ? true : false;

		this.PC += 3;
		this.wait = 3;
	},

	0xED: function() {
		this.Z = false;
		this.N = false;
		this.C = true;
		this.V = false;

		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
		var parNeg = this.memory(address) >= 0x80 ? this.memory(address) - 256 : this.memory(address);
		this.V = aNeg - parNeg < -128 | aNeg + parNeg > 127 ? true : false;

		this.A = (this.A - this.memory(address)) & 0xFF;

		if((this.A - this.memory(address)) & 0xFF < 0) this.C = true;
		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 3;
		this.PC += 3;
	},

	0xFE: function() {
		this.Z = false;
		this.N = false;

		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;

		this.memory(address, (this.memory(address) + 1) && 0xFF);

		if(this.memory(address) === 0) this.Z = true;
		if(this.memory(address) >> 7 === 1) this.N = true;

		this.PC++;
		this.wait = 5;
	},

	0xF0: function() {
		if(this.Z) {
			var disp = this.memory(this.PC + 1) >= 0x80 ? this.memory(this.PC + 1) - 256 : this.memory(this.PC + 1);
			this.PC += 2;
			this.wait = this.PC & 0b0000000011111111 + this.memory(this.PC + 1) > 255 ? 4 : 3;
			this.PC += disp;
		} else this.wait = 2;
	},

	0xF1: function() {
		this.Z = false;
		this.N = false;
		this.C = true;
		this.V = false;

		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;

		var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
		var parNeg = this.memory(address + this.Y) >= 0x80 ? this.memory(address + this.Y) - 256 : this.memory(address + this.Y);
		this.V = aNeg - parNeg < -128 | aNeg + parNeg > 127 ? true : false;

		this.A = (this.A - this.memory(address + this.Y)) & 0xFF;

		if((this.A + this.memory(address + this.Y)) & 0xff > 255) this.C = true;
		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		if(this.Y + bottom < 0) this.wait = 5;
		else this.wait = 4;

		this.PC += 2;
	},

	0xF5: function() {
		this.Z = false;
		this.N = false;
		this.C = true;
		this.V = false;

		var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
		var parNeg = this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) >= 0x80 ? this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) - 256 : this.memory((this.memory(this.PC + 1) + this.X) & 0xFF);
		this.V = aNeg - parNeg < -128 | aNeg + parNeg > 127 ? true : false;

		this.A = (this.A - this.memory((this.memory(this.PC + 1) + this.X) & 0xFF)) & 0xFF;

		if(this.A - this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) < 0) this.C = true;
		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		this.wait = 3;
		this.PC += 2;
	},

	0xF6: function() {
		this.Z = false;
		this.N = false;

		(this.memory((this.memory(PC + 1) + this.X) & 0xFF), ((this.memory(this.memory(PC + 1) + this.X) & 0xFF) + 1) && 0xFF);

		if((this.memory((this.memory(PC + 1) + this.X) & 0xFF)) === 0) this.Z = true;
		if((this.memory((this.memory(PC + 1) + this.X) & 0xFF)) >> 7 === 1) this.N = true;

		this.PC++;
		this.wait = 5;
	},

	0xF8: function() {
		this.PC++;
		this.wait = 1;
	},

	0xF9: function() {
		this.Z = false;
		this.N = false;
		this.C = true;
		this.V = false;

		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
		var parNeg = this.memory(address + this.Y) >= 0x80 ? this.memory(address + this.Y) - 256 : this.memory(address + this.Y);
		this.V = aNeg - parNeg < -128 | aNeg + parNeg > 127 ? true : false;

		this.A = (this.A - this.memory(address + this.Y)) & 0xFF;

		if((this.A - this.memory(address + this.Y)) & 0xFF < 0) this.C = true;
		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		if(this.X + bottom > 255) this.wait = 4;
		else this.wait = 3;

		this.PC += 3;
	},

	0xFD: function() {
		this.Z = false;
		this.N = false;
		this.C = true;
		this.V = false;

		var top = this.memory(this.PC + 2);
		var bottom = this.memory(this.PC + 1);
		var address = (top << 8) + bottom;

		var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
		var parNeg = this.memory(address + this.X) >= 0x80 ? this.memory(address + this.X) - 256 : this.memory(address + this.X);
		this.V = aNeg - parNeg < -128 | aNeg + parNeg > 127 ? true : false;

		this.A = (this.A - this.memory(address + this.X)) & 0xFF;

		if(this.A - this.memory(address + this.X) < 0) this.C = true;
		if(this.A === 0) this.Z = true;
		if(this.A >> 7 === 1) this.N = true;

		if(this.X + bottom > 255) this.wait = 4;
		else this.wait = 3;

		this.PC += 3;
	},

	0xFE: function() {
		this.Z = false;
		this.N = false;

		var top = this.memory(this.memory(this.PC + 1) + 1);
		var bottom = this.memory(this.memory(this.PC + 1));
		var address = (top << 8) + bottom;

		this.memory(address + this.X, (this.memory(address + this.X) + 1) && 0xFF);

		if(this.memory(address + this.X) === 0) this.Z = true;
		if(this.memory(address + this.X) >> 7 === 1) this.N = true;

		this.PC++;
		this.wait = 6;
	}
};

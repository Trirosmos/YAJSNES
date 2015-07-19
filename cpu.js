function CPU(memory) {
	//Initialize the registers.
	this.A = 0x00;
	this.X = 0x00;
	this.Y = 0x00;

	//Initialize Memory
	this.realMem = new Uint8Array(memory);
	for(x = 0x800; x < 65536; x++) {
		this.realMem[x] = 0xFF;
	}
	this.memory = function(address,value)
	{
		if(value === undefined)
		{
		 return this.realMem[address];
		}
		else this.realMem[address] = value;
	}

	//Initialize flags.
	this.C = false;
	this.Z = false;
	this.I = true;
	this.B = true;
	this.V = false;
	this.N = false;

	//Initialize Program Counter
	this.PC = 0x0000;

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
			switch(this.memory(this.PC)) {

			/*
         _        _____
        | |      |  __ \      /\
        | |      | |  | |    /  \
        | |      | |  | |   / /\ \
        | |____  | |__| |  / ____ \
        |______| |_____/  /_/    \_\

        The LDA instruction loads the A register with a 8-bit value.
        That value might be:
         - [Immediate mode (0xA9)) The byte following the OP Code (i.e this.memory(this.PC + 1))
         - [Zero Page Mode (0xA5)) The byte stored at address specified by the byte following the
            OP Code (i.e this.memory(this.memory(this.PC + 1)))
         - [Zero Page,X Mode [0xB5)) The byte stored at address specified by the byte following
            the OP Code added to the value currently held by the X register (i.e
            this.memory((this.memory(this.PC + 1) + this.X) & 0xFF)). Note that this value
            "wraps" around once it reaches 255 e.g: a byte value of 0xFF added to a X register
            value of 0x15 will yield in the address 0x14.
         - [Absolute Moed (0xAD)) The same as the Immediate mode, but instead of a 8-bit address, a
            full 16-bit address is specified by the two bytes following the opcode (little endian).
         - [Absolute,X Mode (0xBD)) The same as the Absolute mode, but the value currently held by the
            X register is added to the address specified by the two bytes following the OP Code.
            The address does not wrap around as in the Zero Page,X mode, what means that if the
            sum of the lower 8 bits of the address with the value of the X register exceeds 255,
            a new add operation will have to be executed as the 6502's ALU has a 8-bit bus, what
            yields in the instruction taking an extre "oops" cycle to be executed.
         - [Absolute,Y Mode (0xB9)) The same as the Absolute,X mode, except that the contents of the
            Y register are added to the address fetched, instead of those from the X register.
         - [Indirect,X Mode (0xA1)) The full 16-bit address of the byte that will be loaded into the
            A register is fetched from the location specified by taking the byte following the OP
            Code and adding it to the value currently held by the X register (with wrap around).
            Note that the address is fetched in little endian formatting, therefore if the byte
            following the OP Code is 0x20, the value in the X register is 0x04, the value in me-
            mory location 0x24 is 0x80 and the value in memory location 0x25 is 0x20, the A regis-
            ter will be loaded with the value held in memory location $2080.
         - [Indirect,Y (0xB1)) A full 16-bit address is fetched from the memory address speci-
            fied by the byte following the OP Code and the is added to the value currently held
            by the Y register. There's no wrap around in this mode, which yield in the instruc-
            tion taking an extra "oops" cycle if the sum of the lower 8 bits of the address and
            the the value held by the Y register is greater thatn 255.                           */

        //Immediate
				case 0xA9:
					this.Z = false;
					this.N = false;

					this.A = this.memory(this.PC + 1);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 1;
					this.PC += 2;

					break;

        //Zero-Page
				case 0xA5:
					this.Z = false;
					this.N = false;

					this.A = this.memory(this.memory(this.PC + 1));

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 2;
					this.PC += 2;

					break;

        //Zero-Page,x
				case 0xB5:
					this.Z = false;
					this.N = false;

					this.A = this.memory((this.memory(this.PC + 1) + this.X) & 0xFF);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 3;
					this.PC += 2;

					break;

        //Absolute
				case 0xAD:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.A = this.memory(address);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 3;
					this.PC += 3;

					break;

        //Absolute,X
				case 0xBD:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.A = this.memory(address + this.X);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					if(this.X + bottom > 255) this.wait = 4;
					else this.wait = 3;

					this.PC += 3;

					break;

        //Absolute,Y
				case 0xB9:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.A = this.memory(address + this.Y);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					if(this.X + bottom > 255) this.wait = 4;
					else this.wait = 3;

					this.PC += 3;

					break;

        //Indirect X
				case 0xA1:
					this.Z = false;
					this.N = false;

					var address = (this.memory(this.PC + 1) + this.X) & 0xFF;
					var top = this.memory(address + 1);
					var bottom = this.memory(address);
					var value = parseInt(top.toString(16) + bottom.toString(16), 16);
					this.A = this.memory(value);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 5;
					this.PC += 2;

					break;

        //Indirect Y
				case 0xB1:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);
					this.A = this.memory(address + this.Y);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					if(this.Y + bottom > 255) this.wait = 5;
					else this.wait = 4;

					this.PC += 2;

					break;

					//LDX

				case 0xA2:
					this.Z = false;
					this.N = false;

					this.X = this.memory(this.PC + 1);

					if(this.X === 0) this.Z = true;
					if(this.X >> 7 === 1) this.N = true;

					this.PC += 2;
					this.wait = 1;

					break;

				case 0xA6:
					this.Z = false;
					this.N = false;

					this.X = this.memory(this.memory(this.PC + 1));

					if(this.X === 0) this.Z = true;
					if(this.X >> 7 === 1) this.N = true;

					this.PC += 2;
					this.wait = 2;

					break;

				case 0xB6:
					this.Z = false;
					this.N = false;

					this.X = this.memory((this.memory(this.PC + 1) + this.Y) & 0xFF);

					if(this.X === 0) this.Z = true;
					if(this.X >> 7 === 1) this.N = true;


					this.PC += 2;
					this.wait = 3;

					break;

				case 0xAE:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);
					this.X = this.memory(address);

					if(this.X === 0) this.Z = true;
					if(this.X >> 7 === 1) this.N = true;

					this.PC += 3;
					this.wait = 3;

					break;

				case 0xBE:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);
					this.X = this.memory(address + this.Y);

					if(this.X === 0) this.Z = true;
					if(this.X >> 7 === 1) this.N = true;

					if(this.Y + bottom > 255) this.wait = 4;
					else this.wait = 3;

					break;

					//LDY

				case 0xA0:
					this.Z = false;
					this.N = false;

					this.Y = this.memory(this.PC + 1);

					if(this.Y === 0) this.Z = true;
					if(this.Y >> 7 === 1) this.N = true;

					this.PC += 2;
					this.wait = 1;

					break;

				case 0xA4:
					this.Z = false;
					this.N = false;

					this.Y = this.memory(this.memory(this.PC + 1));

					if(this.Y === 0) this.Z = true;
					if(this.Y >> 7 === 1) this.N = true;

					this.PC += 2;
					this.wait = 2;

					break;

				case 0xB4:
					this.Z = false;
					this.N = false;

					this.Y = this.memory((this.memory(this.PC + 1) + this.X) & 0xFF);

					if(this.Y === 0) this.Z = true;
					if(this.Y >> 7 === 1) this.N = true;


					this.PC += 2;
					this.wait = 3;

					break;

				case 0xAC:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);
					this.Y = this.memory(address);

					if(this.Y === 0) this.Z = true;
					if(this.Y >> 7 === 1) this.N = true;

					this.PC += 3;
					this.wait = 3;

					break;

				case 0xBC:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);
					this.Y = this.memory(address + this.X);

					if(this.Y === 0) this.Z = true;
					if(this.Y >> 7 === 1) this.N = true;

					if(this.X + bottom > 255) this.wait = 4;
					else this.wait = 3;

					break;

					//STA

				case 0x85:
					this.memory(this.memory(this.PC + 1),this.A);

					this.wait = 2;
					this.PC += 2;

					break;

				case 0x95:
					this.memory(((this.memory(this.PC + 1) + this.X) & 0xFF),this.A);

					this.wait = 3;
					this.PC += 2;

					break;

				case 0x8D:
					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.memory(address,this.A);

					this.wait = 3;
					this.PC += 3;

					break;

				case 0x9D:
					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.memory(address + this.X,this.A);

					this.wait = 4;

					this.PC += 3;

					break;

				case 0x99:
					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.memory(address + this.Y,this.A);

					this.wait = 4;
					this.PC += 3;

					break;

				case 0x81:
					var address = (this.memory(this.PC + 1) + this.X) & 0xFF;
					var top = this.memory(address + 1);
					var bottom = this.memory(address);
					var value = parseInt(top.toString(16) + bottom.toString(16), 16);
					this.memory(value,this.A);

					this.wait = 5;
					this.PC += 2;

					break;

				case 0x91:
					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);
					this.memory(address + this.Y,this.A);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					if(this.Y + bottom > 255) this.wait = 5;
					else this.wait = 4;

					this.PC += 2;

					break;

					//STX

				case 0x86:
					this.memory(this.PC + 1,this.X);

					this.PC += 2;
					this.wait = 2;

					break;

				case 0x96:
					this.memory((this.memory(this.PC + 1) + this.Y) & 0xFF,this.X);

					this.wait = 3;
					this.PC += 2;

					break;

				case 0x8E:
					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.memory(address,this.X);

					this.wait = 3;
					this.PC += 3;

					break;

					//STY

				case 0x84:
					this.memory(this.PC + 1,this.Y);

					this.PC += 2;
					this.wait = 2;

					break;

				case 0x94:
					this.memory(((this.memory(this.PC + 1) + this.X) & 0xFF),this.Y);

					this.wait = 3;
					this.PC += 2;

					break;

				case 0x8C:
					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.memory(address,this.Y);

					this.wait = 3;
					this.PC += 3;

					break;

					//TAX

				case 0xAA:
					this.Z = false;
					this.N = false;

					this.X = this.A;

					if(this.X === 0) this.Z = true;
					if(this.X >> 7 === 1) this.N = true;

					this.PC++;
					this.wait = 1;

          break;

					//TAY

				case 0xA8:
					this.Z = false;
					this.N = false;

					this.Y = this.A;

					if(this.Y === 0) this.Z = true;
					if(this.Y >> 7 === 1) this.N = true;

					this.PC++;
					this.wait = 1;

          break;

					//TXA

				case 0x8A:
					this.Z = false;
					this.N = false;

					this.A = this.X;

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.PC++;
					this.wait = 1;

          break;

					//TYA

				case 0x98:
					this.Z = false;
					this.N = false;

					this.A = this.Y;

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.PC++;
					this.wait = 1;

          break;

					//TSX

				case 0xBA:
					this.Z = false;
					this.N = false;

					this.X = this.SP;

					if(this.X === 0) this.Z = true;
					if(this.X >> 7 === 1) this.N = true;

					this.PC++;
					this.wait = 1;

					break;

					//TXS

				case 0x9A:
					this.SP = this.X;

					this.PC++;
					this.wait = 1;

					break;

					//PHA

				case 0x48:
					this.memory(0x0100 + this.SP,this.A);
					if(this.SP > 0) this.SP--;
					else this.SP = 0xFF;

					this.PC++;
					this.wait = 2;

					break;

					//PHP

				case 0x08:
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
					this.memory(0x0100 + this.SP,status);
					if(this.SP > 0) this.SP--;
					else this.SP = 0xFF;

					this.PC++;
					this.wait = 2;

          break;

					//PLA

				case 0x68:
					this.Z = false;
					this.N = false;

					this.A = this.memory(0x0100 + this.SP);

					if(this.SP < 0xFF) this.SP++;
					else this.SP = 0x00;

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.PC++;
					this.wait = 3;

          break;

					//PLP

				case 0x28:

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

					break;

					//AND

				case 0x29:
					this.Z = false;
					this.N = false;

					this.A = this.A & this.memory(this.PC + 1);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 1;
					this.PC += 2;

					break;

				case 0x25:
					this.Z = false;
					this.N = false;

					this.A = this.A & this.memory(this.memory(this.PC + 1));

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 2;
					this.PC += 2;

					break;

				case 0x35:
					this.Z = false;
					this.N = false;

					this.A = this.A & this.memory((this.memory(this.PC + 1) + this.X) & 0xFF);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 3;
					this.PC += 2;

					break;

				case 0x2D:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.A = this.A & this.memory(address);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 3;
					this.PC += 3;

					break;

				case 0x3D:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.A = this.A & this.memory(address + this.X);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					if(this.X + bottom > 255) this.wait = 4;
					else this.wait = 3;

					this.PC += 3;

					break;

				case 0x39:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.A = this.A & this.memory(address + this.Y);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					if(this.X + bottom > 255) this.wait = 4;
					else this.wait = 3;

					this.PC += 3;

					break;

				case 0x21:
					this.Z = false;
					this.N = false;

					var address = (this.memory(this.PC + 1) + this.X) & 0xFF;
					var top = this.memory(address + 1);
					var bottom = this.memory(address);
					var value = parseInt(top.toString(16) + bottom.toString(16), 16);
					this.A = this.A & this.memory(value);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 5;
					this.PC += 2;

					break;

				case 0x31:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);
					this.A = this.A & this.memory(address + this.Y);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					if(this.Y + bottom > 255) this.wait = 5;
					else this.wait = 4;

					this.PC += 2;

					break;

					//EOR (aka XOR)

				case 0x49:
					this.Z = false;
					this.N = false;

					this.A = this.A ^ this.memory(this.PC + 1);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 1;
					this.PC += 2;

					break;

				case 0x45:
					this.Z = false;
					this.N = false;

					this.A = this.A ^ this.memory(this.memory(this.PC + 1));

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 2;
					this.PC += 2;

					break;

				case 0x55:
					this.Z = false;
					this.N = false;

					this.A = this.A ^ this.memory((this.memory(this.PC + 1) + this.X) & 0xFF);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 3;
					this.PC += 2;

					break;

				case 0x4D:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.A = this.A ^ this.memory(address);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 3;
					this.PC += 3;

					break;

				case 0x5D:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.A = this.A ^ this.memory(address + this.X);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					if(this.X + bottom > 255) this.wait = 4;
					else this.wait = 3;

					this.PC += 3;

					break;

				case 0x59:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.A = this.A ^ this.memory(address + this.Y);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					if(this.X + bottom > 255) this.wait = 4;
					else this.wait = 3;

					this.PC += 3;

					break;

				case 0x41:
					this.Z = false;
					this.N = false;

					var address = (this.memory(this.PC + 1) + this.X) & 0xFF;
					var top = this.memory(address + 1);
					var bottom = this.memory(address);
					var value = parseInt(top.toString(16) + bottom.toString(16), 16);
					this.A = this.A ^ this.memory(value);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 5;
					this.PC += 2;

					break;

				case 0x51:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);
					this.A = this.A ^ this.memory(address + this.Y);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					if(this.Y + bottom > 255) this.wait = 5;
					else this.wait = 4;

					this.PC += 2;

					break;

					//OR

				case 0x09:
					this.Z = false;
					this.N = false;

					this.A = this.A | this.memory(this.PC + 1);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 1;
					this.PC += 2;

					break;

				case 0x05:
					this.Z = false;
					this.N = false;

					this.A = this.A | this.memory(this.memory(this.PC + 1));

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 2;
					this.PC += 2;

					break;

				case 0x15:
					this.Z = false;
					this.N = false;

					this.A = this.A | this.memory((this.memory(this.PC + 1) + this.X) & 0xFF);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 3;
					this.PC += 2;

					break;

				case 0x0D:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.A = this.A | this.memory(address);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 3;
					this.PC += 3;

					break;

				case 0x1D:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.A = this.A | this.memory(address + this.X);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					if(this.X + bottom > 255) this.wait = 4;
					else this.wait = 3;

					this.PC += 3;

					break;

				case 0x19:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.A = this.A | this.memory(address + this.Y);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					if(this.X + bottom > 255) this.wait = 4;
					else this.wait = 3;

					this.PC += 3;

					break;

				case 0x01:
					this.Z = false;
					this.N = false;

					var address = (this.memory(this.PC + 1) + this.X) & 0xFF;
					var top = this.memory(address + 1);
					var bottom = this.memory(address);
					var value = parseInt(top.toString(16) + bottom.toString(16), 16);
					this.A = this.A | this.memory(value);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 5;
					this.PC += 2;

					break;

				case 0x11:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);
					this.A = this.A | this.memory(address + this.Y);

					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					if(this.Y + bottom > 255) this.wait = 5;
					else this.wait = 4;

					this.PC += 2;

					break;

					//BIT

				case 0x24:
					this.Z = false;
					this.V = false;
					this.N = false;

					var ANDed = this.A & this.memory(this.memory(this.PC + 1));
					if(ANDed === 0) this.Z = true;

					this.N = this.memory(this.memory(this.PC + 1)) >> 7 === 1 ? true : false;
					this.V = this.memory(this.memory(this.PC + 1)) & 0b01000000 === 64 ? true : false;

					this.PC += 2;
					this.wait = 2;

					break;

				case 0x2C:
					this.Z = false;
					this.V = false;
					this.N = false;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);
					var value = this.memory(address);

					var ANDed = this.A & value;
					if(ANDed === 0) this.Z = true;

					this.N = value >> 7 === 1 ? true : false;
					this.V = value & 0b01000000 === 64 ? true : false;

					this.PC += 2;
					this.wait = 3;

					break;

					//ADC

				case 0x69:
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

					break;

				case 0x65:
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

					break;

				case 0x75:
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

					break;

				case 0x6D:
					this.Z = false;
					this.N = false;
					this.C = false;
					this.V = false;

					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
					var parNeg = this.memory(address) >= 0x80 ? this.memory(address) - 256 : this.memory(address);
					this.V = aNeg + parNeg < -128 | aNeg + parNeg > 127 ? true : false;

					this.A = (this.A + this.memory(address)) & 0xFF;

					if((this.A + this.memory(address)) & 0xFF > 255) this.C = true;
					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 3;
					this.PC += 3;

					break;

				case 0x7D:
					this.Z = false;
					this.N = false;
					this.C = false;
					this.V = false;

					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

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

					break;

				case 0x79:
					this.Z = false;
					this.N = false;
					this.C = false;
					this.V = false;

					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

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

					break;

				case 0x61:
					this.Z = false;
					this.N = false;
					this.C = false;
					this.V = false;

					var address = (this.memory(this.PC + 1) + this.X) & 0xFF;
					var top = this.memory(address + 1);
					var bottom = this.memory(address);
					var value = parseInt(top.toString(16) + bottom.toString(16), 16);

					var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
					var parNeg = this.memory(value) >= 0x80 ? this.memory(value) - 256 : this.memory(value);
					this.V = aNeg + parNeg < -128 | aNeg + parNeg > 127 ? true : false;

					this.A = (this.A + this.memory(value)) & 0xFF;

					if((this.A + this.memory(value)) & 0xFF > 255) this.C = true;
					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 5;
					this.PC += 2;

					break;

				case 0x71:
					this.Z = false;
					this.N = false;
					this.C = false;
					this.V = false;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

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

					break;

					//SBC

				case 0xE9:
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

					break;

				case 0xE5:
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

					break;

				case 0xF5:
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

					break;

				case 0xED:
					this.Z = false;
					this.N = false;
					this.C = true;
					this.V = false;

					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
					var parNeg = this.memory(address) >= 0x80 ? this.memory(address) - 256 : this.memory(address);
					this.V = aNeg - parNeg < -128 | aNeg + parNeg > 127 ? true : false;

					this.A = (this.A - this.memory(address)) & 0xFF;

					if((this.A - this.memory(address)) & 0xFF < 0) this.C = true;
					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 3;
					this.PC += 3;

					break;

				case 0xFD:
					this.Z = false;
					this.N = false;
					this.C = true;
					this.V = false;

					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

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

					break;

				case 0xF9:
					this.Z = false;
					this.N = false;
					this.C = true;
					this.V = false;

					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

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

					break;

				case 0xE1:
					this.Z = false;
					this.N = false;
					this.C = true;
					this.V = false;

					var address = (this.memory(this.PC + 1) + this.X) & 0xFF;
					var top = this.memory(address + 1);
					var bottom = this.memory(address);
					var value = parseInt(top.toString(16) + bottom.toString(16), 16);

					var aNeg = this.A >= 0x80 ? this.A - 256 : this.A;
					var parNeg = this.memory(value) >= 0x80 ? this.memory(value) - 256 : this.memory(value);
					this.V = aNeg - parNeg < -128 | aNeg + parNeg > 127 ? true : false;

					this.A = (this.A - this.memory(value)) & 0xFF;

					if((this.A - this.memory(value)) & 0xFF < 0) this.C = true;
					if(this.A === 0) this.Z = true;
					if(this.A >> 7 === 1) this.N = true;

					this.wait = 5;
					this.PC += 2;

					break;

				case 0xF1:
					this.Z = false;
					this.N = false;
					this.C = true;
					this.V = false;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

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

					break;

					//CMP

				case 0xC9:
					this.C = this.A >= this.memory(this.PC + 1) ? true : false;
					this.Z = this.A === this.memory(this.PC + 1) ? true : false;
					this.N = (this.A - this.memory(this.PC + 1)) >> 7 === 1 ? true : false;

					this.wait = 1;
					this.PC += 2;

					break;

				case 0xC5:
					this.C = this.A >= this.memory(this.memory(this.PC + 1)) ? true : false;
					this.Z = this.A === this.memory(this.memory(this.PC + 1)) ? true : false;
					this.N = (this.A - this.memory(this.memory(this.PC + 1))) >> 7 === 1 ? true : false;

					this.wait = 2;
					this.PC += 2;

					break;

				case 0xD5:
					this.C = this.A >= (this.memory(this.memory(this.PC + 1)) + this.X) & 0xFF ? true : false;
					this.Z = this.A === this.memory((this.memory(this.PC + 1) + this.X)) & 0xFF ? true : false;
					this.N = (this.A - this.memory((this.memory(this.PC + 1) + this.X)) & 0xFF) >> 7 === 1 ? true : false;

					this.wait = 3;
					this.PC += 2;

					break;

				case 0xCD:
					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.C = this.A >= this.memory(address) ? true : false;
					this.Z = this.A === this.memory(address) ? true : false;
					this.N = (this.A - this.memory(address)) >> 7 === 1 ? true : false;

					this.wait = 3;
					this.PC += 3;

					break;

				case 0xDD:
					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.C = this.A >= this.memory(address + this.X) ? true : false;
					this.Z = this.A === this.memory(address + this.X) ? true : false;
					this.N = (this.A - this.memory(address + this.X)) >> 7 === 1 ? true : false;

					if(this.X + bottom > 255) this.wait = 4;
					else this.wait = 3;

					this.PC += 3;

					break;

				case 0xD9:
					var top = this.memory(this.PC + 2);
					var bottom = this.memory(this.PC + 1);
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.C = this.A >= this.memory(address + this.Y) ? true : false;
					this.Z = this.A === this.memory(address + this.Y) ? true : false;
					this.N = (this.A - this.memory(address + this.Y)) >> 7 === 1 ? true : false;

					if(this.X + bottom > 255) this.wait = 4;
					else this.wait = 3;

					this.PC += 3;

					break;

				case 0xC1:
					var address = (this.memory(this.PC + 1) + this.X) & 0xFF;
					var top = this.memory(address + 1);
					var bottom = this.memory(address);
					var value = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.C = this.A >= this.memory(value) ? true : false;
					this.Z = this.A === this.memory(value) ? true : false;
					this.N = (this.A - this.memory(value)) >> 7 === 1 ? true : false;

					this.wait = 5;
					this.PC += 2;

					break;

				case 0xD1:
					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.C = this.A >= this.memory(address + this.Y) ? true : false;
					this.Z = this.A === this.memory(address + this.Y) ? true : false;
					this.N = (this.A - this.memory(address + this.Y)) >> 7 === 1 ? true : false;

					if(this.Y + bottom > 255) this.wait = 5;
					else this.wait = 4;

					this.PC += 2;

					break;

					//CPX

				case 0xE0:
					this.C = this.X >= this.memory(this.PC + 1) ? true : false;
					this.Z = this.X === this.memory(this.PC + 1) ? true : false;
					this.N = (this.X - this.memory(this.PC + 1)) >> 7 === 1 ? true : false;

					this.PC += 2;
					this.wait = 1;

					break;

				case 0xE4:
					this.C = this.X >= this.memory(this.memory(this.PC + 1)) ? true : false;
					this.Z = this.X === this.memory(this.memory(this.PC + 1)) ? true : false;
					this.N = (this.X - this.memory(this.memory(this.PC + 1))) >> 7 === 1 ? true : false;

					this.PC += 2;
					this.wait = 2;

					break;

				case 0xEC:
					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.C = this.X >= this.memory(address) ? true : false;
					this.Z = this.X === this.memory(address) ? true : false;
					this.N = (this.X - this.memory(address)) >> 7 === 1 ? true : false;

					this.PC += 3;
					this.wait = 3;

					break;

					//CPY

				case 0xC0:
					this.C = this.Y >= this.memory(this.PC + 1) ? true : false;
					this.Z = this.Y === this.memory(this.PC + 1) ? true : false;
					this.N = (this.Y - this.memory(this.PC + 1)) >> 7 === 1 ? true : false;

					this.PC += 2;
					this.wait = 1;

					break;

				case 0xC4:
					this.C = this.Y >= this.memory(this.memory(this.PC + 1)) ? true : false;
					this.Z = this.Y === this.memory(this.memory(this.PC + 1)) ? true : false;
					this.N = (this.Y - this.memory(this.memory(this.PC + 1))) >> 7 === 1 ? true : false;

					this.PC += 2;
					this.wait = 2;

					break;

				case 0xCC:
					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.C = this.Y >= this.memory(address) ? true : false;
					this.Z = this.Y === this.memory(address) ? true : false;
					this.N = (this.Y - this.memory(address)) >> 7 === 1 ? true : false;

					this.PC += 3;
					this.wait = 3;

					break;

					//INC

				case 0xE6:
					this.Z = false;
					this.N = false;

					this.memory(this.memory(PC + 1),(this.memory(this.memory(PC + 1)) + 1) && 0xFF);

					if(this.memory(this.memory(PC + 1)) === 0) this.Z = true;
					if(this.memory(this.memory(PC + 1)) >> 7 === 1) this.N = true;

					this.PC += 2;
					this.wait = 4;

					break;

				case 0xF6:
					this.Z = false;
					this.N = false;

					(this.memory((this.memory(PC + 1) + this.X) & 0xFF),((this.memory(this.memory(PC + 1) + this.X) & 0xFF) + 1) && 0xFF);

					if((this.memory((this.memory(PC + 1) + this.X) & 0xFF)) === 0) this.Z = true;
					if((this.memory((this.memory(PC + 1) + this.X) & 0xFF)) >> 7 === 1) this.N = true;

					this.PC++;
					this.wait = 5;

					break;

				case 0xEE:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.memory(address,(this.memory(address) + 1) && 0xFF);

					if(this.memory(address) === 0) this.Z = true;
					if(this.memory(address) >> 7 === 1) this.N = true;

					this.PC++;
					this.wait = 5;

					break;

				case 0xFE:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.memory(address + this.X,(this.memory(address + this.X) + 1) && 0xFF);

					if(this.memory(address + this.X) === 0) this.Z = true;
					if(this.memory(address + this.X) >> 7 === 1) this.N = true;

					this.PC++;
					this.wait = 6;

					break;

					//INX

				case 0xE8:
					this.Z = false;
					this.N = false;

					this.X = (this.X + 1) & 0xFF;

					if(this.X === 0) this.Z = true;
					if(this.X >> 7 === 1) this.N = true;

					this.PC++;
					this.wait = 1;

					break;

					//INY

				case 0xC8:
					this.Z = false;
					this.N = false;

					this.Y = (this.Y + 1) & 0xFF;

					if(this.Y === 0) this.Z = true;
					if(this.Y >> 7 === 1) this.N = true;

					this.PC++;
					this.wait = 1;

					break;

					//DEC

				case 0xC6:
					this.Z = false;
					this.N = false;

					this.memory(this.memory(PC + 1),(this.memory(this.memory(PC + 1)) - 1) && 0xFF);

					if(this.memory(this.memory(PC + 1)) === 0) this.Z = true;
					if(this.memory(this.memory(PC + 1)) >> 7 === 1) this.N = true;

					this.PC += 2;
					this.wait = 4;

					break;

				case 0xD6:
					this.Z = false;
					this.N = false;

					this.memory((this.memory(PC + 1) + this.X & 0xFF),((this.memory(this.memory(PC + 1) + this.X) & 0xFF) - 1) && 0xFF);

					if((this.memory((this.memory(PC + 1) + this.X & 0xFF))) === 0) this.Z = true;
					if((this.memory((this.memory(PC + 1) + this.X & 0xFF))) >> 7 === 1) this.N = true;

					this.PC++;
					this.wait = 5;

					break;

				case 0xCE:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.memory(address,(this.memory(address) - 1) && 0xFF);

					if(this.memory(address) === 0) this.Z = true;
					if(this.memory(address) >> 7 === 1) this.N = true;

					this.PC++;
					this.wait = 5;

					break;

				case 0xDE:
					this.Z = false;
					this.N = false;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.memory(address + this.X,(this.memory(address + this.X) - 1) && 0xFF);

					if(this.memory(address + this.X) === 0) this.Z = true;
					if(this.memory(address + this.X) >> 7 === 1) this.N = true;

					this.PC++;
					this.wait = 6;

					break;

					//DEX

				case 0xCA:
					this.Z = false;
					this.N = false;

					this.X = (this.X - 1) & 0xFF;

					if(this.X === 0) this.Z = true;
					if(this.X >> 7 === 1) this.N = true;

					this.PC++;
					this.wait = 1;

					break;

					//DEY

				case 0x88:
					this.Z = false;
					this.N = false;

					this.Y = (this.Y - 1) & 0xFF;

					if(this.Y === 0) this.Z = true;
					if(this.Y >> 7 === 1) this.N = true;

					this.PC++;
					this.wait = 1;

					break;

					//ASL

				case 0x0A:
					this.C = false;
					this.Z = false;
					this.N = false;

					this.C = this.A >> 7 === 1 ? true : false;
					this.A = this.A << 1;

					if(this.A >> 7 === 1) this.N = true;
					if(this.A === 0) this.Z = true;

					this.PC++;
					this.wait = 1;

					break;

				case 0x06:
					this.C = false;
					this.Z = false;
					this.N = false;

					this.C = this.memory(this.memory(this.PC + 1)) >> 7 === 1 ? true : false;
					this.memory(this.memory(this.PC + 1),this.memory(this.memory(this.PC + 1)) << 1);

					if(this.memory(this.memory(this.PC + 1)) >> 7 === 1) this.N = true;
					if(this.memory(this.memory(this.PC + 1)) === 0) this.Z = true;

					this.PC += 2;
					this.wait = 4;

					break;

				case 0x16:
					this.C = false;
					this.Z = false;
					this.N = false;

					this.C = this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) >> 7 === 1 ? true : false;
					this.memory((this.memory(this.PC + 1) + this.X) & 0xFF,this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) << 1);

					if(this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) >> 7 === 1) this.N = true;
					if(this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) === 0) this.Z = true;

					this.PC += 2;
					this.wait = 5;

					break;

				case 0x0E:
					this.C = false;
					this.Z = false;
					this.N = false;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.C = this.memory(address) >> 7 === 1 ? true : false;
					this.memory(address,this.memory(address) << 1);

					if(this.memory(address) >> 7 === 1) this.N = true;
					if(this.memory(address) === 0) this.Z = true;

					this.PC += 3;
					this.wait = 5;

					break;

				case 0x1E:
					this.C = false;
					this.Z = false;
					this.N = false;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.C = this.memory(address + this.X) >> 7 === 1 ? true : false;
					this.memory(address + this.X,this.memory(address + this.X) << 1);

					if(this.memory(address + this.X) >> 7 === 1) this.N = true;
					if(this.memory(address + this.X) === 0) this.Z = true;

					this.PC += 3;
					this.wait = 6;

					break;

					//LSR

				case 0x4A:
					this.C = false;
					this.Z = false;
					this.N = false;

					this.C = this.A & 0b00000001 === 1 ? true : false;
					this.A = this.A >> 1;

					if(this.A >> 7 === 1) this.N = true;
					if(this.A === 0) this.Z = true;

					this.PC++;
					this.wait = 1;

					break;

				case 0x46:
					this.C = false;
					this.Z = false;
					this.N = false;

					this.C = this.memory(this.memory(this.PC + 1)) & 0b00000001 === 1 ? true : false;
					this.memory(this.memory(this.PC + 1),this.memory(this.memory(this.PC + 1)) >> 1);

					if(this.memory(this.memory(this.PC + 1)) >> 7 === 1) this.N = true;
					if(this.memory(this.memory(this.PC + 1)) === 0) this.Z = true;

					this.PC += 2;
					this.wait = 4;

					break;

				case 0x56:
					this.C = false;
					this.Z = false;
					this.N = false;

					this.C = this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) & 0b00000001 === 1 ? true : false;
					this.memory((this.memory(this.PC + 1) + this.X) & 0xFF,this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) >> 1);

					if(this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) >> 7 === 1) this.N = true;
					if(this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) === 0) this.Z = true;

					this.PC += 2;
					this.wait = 5;

					break;

				case 0x4E:
					this.C = false;
					this.Z = false;
					this.N = false;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.C = this.memory(address) & 0b00000001 === 1 ? true : false;
					this.memory(address,this.memory(address) >> 1);

					if(this.memory(address) >> 7 === 1) this.N = true;
					if(this.memory(address) = 0) this.Z = true;

					this.PC += 3;
					this.wait = 5;

					break;

				case 0x5E:
					this.C = false;
					this.Z = false;
					this.N = false;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.C = this.memory(address + this.X) & 0b00000001 === 1 ? true : false;
					this.memory(address + this.X,this.memory(address + this.X) >> 1);

					if(this.memory(address + this.X) >> 7 === 1) this.N = true;
					if(this.memory(address + this.X) === 0) this.Z = true;

					this.PC += 3;
					this.wait = 6;

					break;

					//ROL

				case 0x2A:
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

					break;

				case 0x26:
					this.C = false;
					this.Z = false;
					this.N = false;

					var carry = this.C ? 1 : 0;

					this.C = this.memory(this.memory(this.PC + 1)) >> 7 === 1 ? true : false;
					this.memory(this.memory(this.PC + 1),this.memory(this.memory(this.PC + 1)) << 1 | carry);

					if(this.memory(this.memory(this.PC + 1)) >> 7 === 1) this.N = true;
					if(this.memory(this.memory(this.PC + 1)) === 0) this.Z = true;

					this.PC += 2;
					this.wait = 4;

					break;

				case 0x36:
					this.C = false;
					this.Z = false;
					this.N = false;

					var carry = this.C ? 1 : 0;

					this.C = this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) >> 7 === 1 ? true : false;
					this.memory((this.memory(this.PC + 1) + this.X) & 0xFF,this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) << 1 | carry);

					if(this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) >> 7 === 1) this.N = true;
					if(this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) === 0) this.Z = true;

					this.PC += 2;
					this.wait = 5;

					break;

				case 0x2E:
					this.C = false;
					this.Z = false;
					this.N = false;

					var carry = this.C ? 1 : 0;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.C = this.memory(address) >> 7 === 1 ? true : false;
					this.memory(address,this.memory(address) << 1 | carry);

					if(this.memory(address) >> 7 === 1) this.N = true;
					if(this.memory(address) = 0) this.Z = true;

					this.PC += 3;
					this.wait = 5;

					break;

				case 0x3E:
					this.C = false;
					this.Z = false;
					this.N = false;

					var carry = this.C ? 1 : 0;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.C = this.memory(address + this.X) >> 7 === 1 ? true : false;
					this.memory(address + this.X,this.memory(address + this.X) << 1 | carry);

					if(this.memory(address + this.X) >> 7 === 1) this.N = true;
					if(this.memory(address + this.X) === 0) this.Z = true;

					this.PC += 3;
					this.wait = 6;

					break;

					//ROR

				case 0x6A:
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

					break;

				case 0x66:
					this.C = false;
					this.Z = false;
					this.N = false;

					var carry = this.C ? 0b10000000 : 0;

					this.C = this.memory(this.memory(this.PC + 1)) & 0b00000001 === 1 ? true : false;
					this.memory(this.memory(this.PC + 1),this.memory(this.memory(this.PC + 1)) >> 1 | carry);

					if(this.memory(this.memory(this.PC + 1)) >> 7 === 1) this.N = true;
					if(this.memory(this.memory(this.PC + 1)) === 0) this.Z = true;

					this.PC += 2;
					this.wait = 4;

					break;

				case 0x76:
					this.C = false;
					this.Z = false;
					this.N = false;

					var carry = this.C ? 0b10000000 : 0;

					this.C = this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) & 0b00000001 === 1 ? true : false;
					this.memory((this.memory(this.PC + 1) + this.X) & 0xFF,this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) >> 1 | carry);

					if(this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) >> 7 === 1) this.N = true;
					if(this.memory((this.memory(this.PC + 1) + this.X) & 0xFF) === 0) this.Z = true;

					this.PC += 2;
					this.wait = 5;

					break;

				case 0x6E:
					this.C = false;
					this.Z = false;
					this.N = false;

					var carry = this.C ? 0b10000000 : 0;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.C = this.memory(address) & 0b00000001 === 1 ? true : false;
					this.memory(address,this.memory(address) >> 1 | carry);

					if(this.memory(address) >> 7 === 1) this.N = true;
					if(this.memory(address) = 0) this.Z = true;

					this.PC += 3;
					this.wait = 5;

					break;

				case 0x7E:
					this.C = false;
					this.Z = false;
					this.N = false;

					var carry = this.C ? 0b10000000 : 0;

					var top = this.memory(this.memory(this.PC + 1) + 1);
					var bottom = this.memory(this.memory(this.PC + 1));
					var address = parseInt(top.toString(16) + bottom.toString(16), 16);

					this.C = this.memory(address + this.X) & 0b00000001 === 1 ? true : false;
					this.memory(address + this.X,this.memory(address + this.X) >> 1 | carry);

					if(this.memory(address + this.X) >> 7 === 1) this.N = true;
					if(this.memory(address + this.X) === 0) this.Z = true;

					this.PC += 3;
					this.wait = 6;

					break;

					//BCC

				case 0x90:
					this.PC += 2;
					if(!this.C) {
						var disp = this.memory(this.PC + 1) >= 0x80 ? this.memory(this.PC + 1) - 256 : this.memory(this.PC + 1);
						this.wait = this.PC & 0b0000000011111111 + this.memory(this.PC + 1) > 255 ? 4 : 3;
						this.PC += disp;
					} else this.wait = 2;

					break;

					//BCS

				case 0xB0:
					this.PC += 2;
					if(this.C) {
						var disp = this.memory(this.PC + 1) >= 0x80 ? this.memory(this.PC + 1) - 256 : this.memory(this.PC + 1);
						this.wait = this.PC & 0b0000000011111111 + this.memory(this.PC + 1) > 255 ? 4 : 3;
						this.PC += disp;
					} else this.wait = 2;

					break;

					//BEQ

				case 0xF0:
					this.PC += 2;
					if(this.Z) {
						var disp = this.memory(this.PC + 1) >= 0x80 ? this.memory(this.PC + 1) - 256 : this.memory(this.PC + 1);
						this.wait = this.PC & 0b0000000011111111 + this.memory(this.PC + 1) > 255 ? 4 : 3;
						this.PC += disp;
					} else this.wait = 2;

					break;

					//BMI

				case 0x30:
					this.PC += 2;
					if(this.N) {
						var disp = this.memory(this.PC + 1) >= 0x80 ? this.memory(this.PC + 1) - 256 : this.memory(this.PC + 1);
						this.wait = this.PC & 0b0000000011111111 + this.memory(this.PC + 1) > 255 ? 4 : 3;
						this.PC += disp;
					} else this.wait = 2;

					break;

					//BNE

				case 0xD0:
					this.PC += 2;
					if(!this.Z) {
						var disp = this.memory(this.PC + 1) >= 0x80 ? this.memory(this.PC + 1) - 256 : this.memory(this.PC + 1);
						this.wait = this.PC & 0b0000000011111111 + this.memory(this.PC + 1) > 255 ? 4 : 3;
						this.PC += disp;
					} else this.wait = 2;

					break;

					//BPL

				case 0x10:
					this.PC += 2;
					if(!this.N) {
						var disp = this.memory(this.PC + 1) >= 0x80 ? this.memory(this.PC + 1) - 256 : this.memory(this.PC + 1);
						this.wait = this.PC & 0b0000000011111111 + this.memory(this.PC + 1) > 255 ? 4 : 3;
						this.PC += disp;
					} else this.wait = 2;

					break;

					//BPL

				case 0x50:
					this.PC += 2;
					if(!this.V) {
						var disp = this.memory(this.PC + 1) >= 0x80 ? this.memory(this.PC + 1) - 256 : this.memory(this.PC + 1);
						this.wait = this.PC & 0b0000000011111111 + this.memory(this.PC + 1) > 255 ? 4 : 3;
						this.PC += disp;
					} else this.wait = 2;

					break;

					//BVS

				case 0x70:
					this.PC += 2;
					if(this.V) {
						var disp = this.memory(this.PC + 1) >= 0x80 ? this.memory(this.PC + 1) - 256 : this.memory(this.PC + 1);
						this.wait = this.PC & 0b0000000011111111 + this.memory(this.PC + 1) > 255 ? 4 : 3;
						this.PC += disp;
					} else this.wait = 2;

					break;

					//CLC

				case 0x18:
					this.C = false;
					this.PC++;
					this.wait = 1;
					break;

					//CLD

				case 0xD8:
					this.PC++;
					this.wait = 1;
					break;

					//CLI

				case 0x58:
					this.I = false;
					this.PC++;
					this.wait = 1;
					break;

					//CLV

				case 0xB8:
					this.V = false;
					this.PC++;
					this.wait = 1;
					break;

					//SEQ

				case 0x38:
					this.C = true;
					this.PC++;
					this.wait = 1;
					break;

					//SED

				case 0xF8:
					this.PC++;
					this.wait = 1;
					break;

					//SEI

				case 0x78:
					this.I = true;
					this.PC++;
					this.wait = 1;
					break;

					//BRK

				case 0x00:
					var C = this.C ? 1 : 0;
					var Z = this.Z ? 2 : 0 << 1;
					var I = this.I ? 4 : 0 << 2;
					var D = 0 << 3;
					var B = this.B ? 16 : 0 << 4;
					var not = 32;
					var V = this.V ? 64 : 0 << 6;
					var N = this.N ? 128 : 0 << 7;
					var status = C + Z + I + D + B + not + V + N;

					this.memory(0x0100 + this.SP,this.PC >> 8);
					this.memory((0x0100 + this.SP - 1) & 0xFF,this.PC & 0b0000000011111111);
					this.memory((0x0100 + this.SP - 2) & 0xFF,status);

					this.I = this.B = true;

					this.SP = (this.SP - 3) & 0xFF;

					this.PC = this.memory(0xFFFF) << 8 + this.memory(0xFFFE);

					this.wait = 6;

					break;

					//NOP

				case 0xEA:
				  this.PC++;
				  this.wait = 1
				break;

				//RTI

				case 0x40:
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

          break;
			}
		} else this.wait--;
	}

}

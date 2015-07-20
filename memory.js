function Memory(file,callback)
{
 this.Reader = new FileReader();
 this.Reader.readAsArrayBuffer(file);

 this.rom = {};

 this.ram = new Array(0x07FF);

 this.currentBank = 0;

 var that = this;

 this.Reader.onload = function()
 {
   var rawData = new Uint8Array(this.result);
   var rom = that.rom;

   if(rawData[0] << 32 + rawData[1] << 16 + rawData[2] << 8 + rawData[3] === 79872)
   {
     rom.pgrAmount = rawData[4];
     rom.chrAmount = rawData[5];
     rom.hasTrainer = (rawData[6] & 0b00000100) >> 2 === 1 ? true : false;
     rom.header = rawData.subarray(0,16);
     rom.pgrromOffset = rom.hasTrainer ? 528 : 16;
     if(rom.hasTrainer) rom.trainer = rawData.subarray(16,528);
     rom.mapperType = ((rawData[7] >> 4) << 4) + (rawData[6] >> 4) ;
     var pgrRaw = rawData.subarray(rom.pgrromOffset,(rom.pgrromOffset + 1) + (16384 * rom.pgrAmount));
     rom.pgr16kBanks = [];
     rom.pgr8kBanks = [];
     for(x = 0;x < rom.pgrAmount; x++)
     {
       rom.pgr16kBanks[x] = pgrRaw.subarray(16384 * x, 16384 + 16384 * x);
     }
     for(x = 0;x < rom.pgrAmount * 2; x++)
     {
       rom.pgr8kBanks[x] = pgrRaw.subarray(8192 * x, 8192 + 8192 * x);
     }

     callback(that);
   }

   else console.log("This doesn't seems to be a NES rom...");
 }

 this.cpuRead = function(address,value)
 {
   //CPU is reading a value
   if(value === undefined)
   {
     // The CPU is reading from RAM. Read from the RAM array;
     if(address <= 0x07FF)
     {
       return that.ram[address];
     }

     //The CPU is reading from a RAM mirror. Calculate address and read from the RAM array;
     if(address > 0x07FF && address <= 0x1FFF)
     {
       var ramMirrorNumber = (address - (address % 0x800));
       return that.ram[address - ramMirrorNumber];
     }

     //Mapper is UxROM
     if(that.rom.mapperType === 2)
     {
       // The CPU is reading from the low bank. Read from the currently selected bank.
       if(address >= 0x8000 && address < 0xC000)
       {
         return that.rom.pgr16kBanks[that.currentBank][address - 0x8000];
       }

       // The CPU is reading from the high bank. Load from the last bank;
       if(address >= 0xC000)
       {
         return that.rom.pgr16kBanks[that.rom.pgr16kBanks.length - 1][address - 0xC000];
       }

       else return 0xFF;
     }
   }

   //CPU is writing a value
   else
   {
     // CPU is writing to RAM. Write to RAM array;
     if(address <= 0x07FF)
     {
       that.ram[address] = value;
     }

     // CPU is writing to a RAM mirror. Calculate address and write to RAM array;
     if(address > 0x07FF && address <= 0x1FFF)
     {
       var ramMirrorNumber = (address - (address % 0x800));
       that.ram[address - ramMirrorNumber] = value;
     }

     if(that.rom.mapperType === 2)
     {
       // CPU is writing to ROM. Select the current bank;
       if(address >= 0x8000)
       {
         that.currentBank = value;
       }
     }


   }
 }


}

const { ethers } = require("hardhat");
const { utils, BigNumber } = require("ethers");
const hre = require("hardhat");

// Constants
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount / 10 ** decimals;
const pointZeroOne = convert("0.01", 18);

const VOTER_ADDRESS = "0x580ABF764405aA82dC96788b356435474c5956A7";
const WBERA_ADDRESS = "0x7507c1dc16935B82698e4C63f2746A2fCf994dF8"; // WBERA address
const OBERO_ADDRESS = "0x7629668774f918c00Eb4b03AdF5C4e2E53d45f0b";

// Contract Variables
let units, key, factory, plugin, multicall;

/*===================================================================*/
/*===========================  CONTRACT DATA  =======================*/

async function getContracts() {
  units = await ethers.getContractAt(
    "contracts/Units.sol:Units",
    "0xa51deBeAA1CEf11f28bc80E2Df4DD1665dD2D460"
  );
  key = await ethers.getContractAt(
    "contracts/Key.sol:Key",
    "0x6679732D6C09c56faB4cBf589E01F5e41A2d9e67"
  );
  factory = await ethers.getContractAt(
    "contracts/Factory.sol:Factory",
    "0x12cF1dC4A8d66187202511a706E90Dfb7BE8a80C"
  );
  plugin = await ethers.getContractAt(
    "contracts/QueuePlugin.sol:QueuePlugin",
    "0xa1b0D1CC5Ca0F68Fa70B0575c9782e7B5b02859c"
  );
  multicall = await ethers.getContractAt(
    "contracts/Multicall.sol:Multicall",
    "0x2E31E161EC6F03895C68121e834C133862ddbD2d"
  );
  console.log("Contracts Retrieved");
}

/*===========================  END CONTRACT DATA  ===================*/
/*===================================================================*/

async function deployUnits() {
  console.log("Starting Units Deployment");
  const unitsArtifact = await ethers.getContractFactory("Units");
  const unitsContract = await unitsArtifact.deploy({
    gasPrice: ethers.gasPrice,
  });
  units = await unitsContract.deployed();
  await sleep(5000);
  console.log("Units Deployed at:", units.address);
}

async function deployKey() {
  console.log("Starting Key Deployment");
  const keyArtifact = await ethers.getContractFactory("Key");
  const keyContract = await keyArtifact.deploy({
    gasPrice: ethers.gasPrice,
  });
  key = await keyContract.deployed();
  await sleep(5000);
  console.log("Key Deployed at:", key.address);
}

async function deployFactory() {
  console.log("Starting Factory Deployment");
  const factoryArtifact = await ethers.getContractFactory("Factory");
  const factoryContract = await factoryArtifact.deploy(
    units.address,
    key.address,
    {
      gasPrice: ethers.gasPrice,
    }
  );
  factory = await factoryContract.deployed();
  await sleep(5000);
  console.log("Factory Deployed at:", factory.address);
}

async function deployPlugin(wallet) {
  console.log("Starting Plugin Deployment");
  const pluginArtifact = await ethers.getContractFactory("QueuePlugin");
  const pluginContract = await pluginArtifact.deploy(
    WBERA_ADDRESS,
    VOTER_ADDRESS,
    [WBERA_ADDRESS],
    [WBERA_ADDRESS],
    wallet.address,
    factory.address,
    units.address,
    key.address,
    pointZeroOne,
    {
      gasPrice: ethers.gasPrice,
    }
  );
  plugin = await pluginContract.deployed();
  await sleep(5000);
  console.log("Plugin Deployed at:", plugin.address);
}

async function deployMulticall() {
  console.log("Starting Multicall Deployment");
  const multicallArtifact = await ethers.getContractFactory("Multicall");
  const multicallContract = await multicallArtifact.deploy(
    units.address,
    factory.address,
    key.address,
    plugin.address,
    OBERO_ADDRESS,
    {
      gasPrice: ethers.gasPrice,
    }
  );
  multicall = await multicallContract.deployed();
  console.log("Multicall Deployed at:", multicall.address);
}

async function printDeployment() {
  console.log("**************************************************************");
  console.log("Units: ", units.address);
  console.log("Key: ", key.address);
  console.log("Factory: ", factory.address);
  console.log("Plugin: ", plugin.address);
  console.log("Multicall: ", multicall.address);
  console.log("**************************************************************");
}

async function verifyUnits() {
  await hre.run("verify:verify", {
    address: units.address,
    constructorArguments: [],
  });
}

async function verifyKey() {
  await hre.run("verify:verify", {
    address: key.address,
    constructorArguments: [],
  });
}

async function verifyFactory() {
  await hre.run("verify:verify", {
    address: factory.address,
    constructorArguments: [units.address, key.address],
  });
}

async function verifyPlugin() {
  await hre.run("verify:verify", {
    address: plugin.address,
    constructorArguments: [
      WBERA_ADDRESS,
      VOTER_ADDRESS,
      [WBERA_ADDRESS],
      [WBERA_ADDRESS],
      OBERO_ADDRESS,
      factory.address,
      units.address,
      key.address,
      pointZeroOne,
    ],
  });
}

async function verifyMulticall() {
  await hre.run("verify:verify", {
    address: multicall.address,
    constructorArguments: [
      units.address,
      factory.address,
      key.address,
      plugin.address,
      OBERO_ADDRESS,
    ],
  });
}

async function setUpSystem(wallet) {
  console.log("Starting System Set Up");
  await units.connect(wallet).setMinter(factory.address, true);
  console.log("factory whitelisted to mint units.");
  await units.connect(wallet).setMinter(plugin.address, true);
  console.log("plugin whitelisted to mint units.");
  console.log("System Initialized");
}

async function setTools(wallet) {
  console.log("Starting Building Deployment");
  const buildingUps = [
    convert("0.000000002", 18),
    convert("0.00000002", 18),
    convert("0.00000016", 18),
    convert("0.00000094", 18),
    convert("0.0000052", 18),
    convert("0.000028", 18),
    convert("0.000156", 18),
    convert("0.00088", 18),
    convert("0.0052", 18),
    convert("0.032", 18),
    convert("0.20", 18),
    convert("1.30", 18),
    convert("8.60", 18),
    convert("58", 18),
    convert("420", 18),
  ];
  const buildingCost = [
    convert("0.000015", 18),
    convert("0.0001", 18),
    convert("0.0011", 18),
    convert("0.012", 18),
    convert("0.13", 18),
    convert("0.6", 18),
    convert("3.2", 18),
    convert("17", 18),
    convert("100", 18),
    convert("600", 18),
    convert("4000", 18),
    convert("26000", 18),
    convert("170000", 18),
    convert("1100000", 18),
    convert("7000000", 18),
  ];
  await factory.connect(wallet).setTool(buildingUps, buildingCost);
  console.log("Buildings set");
}

async function setToolMultipliers(wallet) {
  console.log("Starting Multiplier Deployment");
  await factory
    .connect(wallet)
    .setToolMultipliers([
      "1000000000000000000",
      "1150000000000000000",
      "1322500000000000000",
      "1520875000000000000",
      "1749006250000000000",
      "2011357187500000000",
      "2313060768750000000",
      "2660019884062500000",
      "3059022867265625000",
      "3517876297355468750",
      "4045557736969289062",
      "4652391392514672421",
      "5350250105891873285",
      "6152787621674654277",
      "7075705764925852415",
      "8137061629665738723",
      "9357620874116591137",
      "10761264009734079868",
      "12375453609734181844",
      "14231771647954150830",
      "16366537393147273455",
      "18821517902019348493",
      "21644745787322255767",
      "24891457556820594132",
      "28625176193143683252",
      "32918952612105216229",
      "37856795515121028664",
      "43535314841394182944",
      "50065612067598320385",
      "57575453877633198463",
      "66211771960298198222",
      "76143537754252997955",
      "87565068417320947649",
      "10069982869941708939",
      "11580480300432965283",
      "13317552345497960076",
      "15315185197222654087",
      "17612462976706053100",
      "20254332423211961060",
      "23292482286663755219",
      "26786354629563386402",
      "30804307823997894363",
      "35424953998547578427",
      "40738697098379715291",
      "46849501663136672535",
      "53876926912607173406",
      "61958465929798249316",
      "71252235819267986714",
      "81940071292158184721",
      "94231081886081832429",
      "10836574416999335555",
      "12462060579549233808",
      "14331369666481623980",
      "16481075166353877597",
      "18953236344506959186",
      "21796221830265903064",
      "25065655184705788524",
      "28825503362461656603",
      "33149328872230990093",
      "38121728203064738607",
      "43839987483524387828",
      "50415985506053045913",
      "57978383871960902700",
      "66675140952765438105",
      "76676412093680261321",
      "88177873807732200519",
      "10140455477989193059",
      "11661523849617504018",
      "13410752326730129621",
      "15422365251154839863296",
      "17735720038828064374784",
      "20396078044652272353280",
      "23455489751350111109120",
      "26973813214052626726912",
      "31019885196160517799936",
      "35672867975584597147648",
      "41023798171922283364352",
      "47177367897710616641536",
      "54253973082367204524032",
      "62392069044722280169472",
      "71750879401430621356032",
      "82513511311645194846208",
      "94890538008391970717696",
      "109124118709650768003072",
      "125492736516098353004544",
      "144316646993513104277504",
      "165964144042540085018624",
      "190858765648921054150656",
      "219487580496259213950976",
      "252410717570698047389696",
      "290272325206302756175872",
      "333813173987248147791872",
      "383885150085335322984448",
      "441467922598135601299456",
      "507688110987855884451840",
      "583841327636034200010752",
      "671417526781439249481728",
      "772130155798655083216896",
      "887949679168453372542976",
      "1021142131043721304604672",
      "1174313450700279386210304",
    ]);
  console.log("Multipliers set");
}

async function setLevels(wallet) {
  console.log("Starting Level Deployment");
  await factory
    .connect(wallet)
    .setLvl(
      ["0", "10", "50", "500", "50000", "5000000"],
      [0, 1, 5, 25, 50, 100]
    );
  console.log("Levels set");
}

async function setEvolution(wallet) {
  console.log("Starting Evolution Deployment");
  await factory
    .connect(wallet)
    .setEvolution(
      [
        "0",
        "10000000000000000000",
        "100000000000000000000",
        "1000000000000000000000",
        "1000000000000000000000",
        "10000000000000000000000",
        "100000000000000000000000",
        "1000000000000000000000000",
        "10000000000000000000000000",
        "100000000000000000000000000",
      ],
      [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    );
  console.log("Evolution set");
}

async function main() {
  const [wallet] = await ethers.getSigners();
  console.log("Using wallet: ", wallet.address);

  await getContracts();

  // await deployUnits();
  // await deployKey();
  // await deployFactory();
  // await deployPlugin(wallet);
  // await deployMulticall();
  // await printDeployment();

  // await verifyUnits();
  // await verifyKey();
  // await verifyFactory();
  // await verifyPlugin();
  // await verifyMulticall();

  // await setUpSystem(wallet);
  // await setTools(wallet);
  // await setToolMultipliers(wallet);
  // await setLevels(wallet);
  // await setEvolution(wallet);

  // await plugin.setEntryFee("42690000000000000");

  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

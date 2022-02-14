import axios from "axios";
import { ethers } from "ethers";
import { create, urlSource } from "ipfs-http-client";

const DaoFactory = require("../contract/DaoFactory.json");
const InstaDao = require("../contract/InstaDao.json");

declare let window: any;

export const getSignedNonce = async (nonce: string) => {
  const { ethereum } = window;

  if (!ethereum) {
    console.log("Make sure you have metamask!");
    return;
  } else {
    console.log("We have the ethereum object");
  }

  const hexNonce = ethers.utils.hexlify(Number(nonce));

  console.log({ hexNonce });

  const signature = await ethereum.request({
    method: "personal_sign",
    params: [hexNonce, ethereum.selectedAddress],
  });

  console.log({ signature, nonce });

  return signature;
};

export const checkIfWalletIsConnected = async (): Promise<string> => {
  try {
    if (!window) {
      throw new Error("No window object");
    }

    const { ethereum } = window;

    if (!ethereum) {
      console.log("Make sure you have metamask!");
      return;
    } else {
      console.log("We have the ethereum object");
    }

    /*
     * Check if we're authorized to access the user's wallet
     */

    let chainId = await ethereum.request({ method: "eth_chainId" });

    // String, hex code of the chainId of the Rinkebey test network
    // const rinkebyChainId = "0x4";
    const mainnetChainId = "0x1";
    if (chainId !== mainnetChainId) {
      throw new Error("Please connect to the mainnet");
    }

    const accounts = await ethereum.request({ method: "eth_accounts" });

    /*
     * User can have multiple authorized accounts, we grab the first one if its there!
     */

    if (accounts.length !== 0) {
      const account = accounts[0];
      console.log("Found an authorized account:", account);
      return account;
    } else {
      console.log("No authorized account found");
    }
  } catch (error) {
    console.error(error);
  }
};

export const connectWallet = async () => {
  try {
    if (!window) {
      throw new Error("No window object");
    }

    const { ethereum } = window;

    if (!ethereum) {
      alert("Get MetaMask!");
      return;
    }

    /*
     * Fancy method to request access to account.
     */

    // let chainId = await ethereum.request({ method: "eth_chainId" });
    // console.log(chainId);
    // console.log("Connected to chain " + chainId);

    // // String, hex code of the chainId of the Rinkebey test network
    // const rinkebyChainId = "0x4";
    // if (chainId !== rinkebyChainId) {
    // 	alert("You are not connected to the Rinkeby Test Network!");
    // 	throw new Error(
    // 		"You are not connected to the Rinkeby Test Network!"
    // 	);
    // }

    const accounts = await ethereum.request({
      method: "eth_requestAccounts",
    });

    /*
     * Boom! This should print out public address once we authorize Metamask.
     */
    console.log({ accounts });
    console.log("Connected", accounts[0]);

    return accounts[0];
  } catch (error) {
    console.log(error);
  }
};

export const sendTransaction = async (
  addr: string,
  message: string,
  ether: string
) => {
  await window.ethereum.send("eth_requestAccounts");
  console.log("here", ethers);
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  console.log({ provider });
  const signer = provider.getSigner();
  ethers.utils.getAddress(addr);
  console.log({ signer });
  const hexaMessage = ethers.utils.formatBytes32String(message);
  console.log({ hexaMessage });
  const tx = await signer.sendTransaction({
    to: addr,
    value: ethers.utils.parseEther(ether),
    data: hexaMessage,
  });

  return tx;
};

export interface ENSResponse {
  address?: string | null;
  name?: string | null;
  avatar?: string | null;
  error?: string | null;
}
export const validateAndResolveAddress = async (
  userAddress: string,
  provider: ethers.providers.Web3Provider | ethers.providers.JsonRpcProvider
): Promise<ENSResponse | undefined> => {
  try {
    let address, name, avatar;

    if (userAddress.includes(".")) {
      const ensResolver = await provider.resolveName(userAddress);

      if (!ensResolver) {
        // toast.error("This address is not valid");
        throw new Error("This address is not valid");
      }

      address = ensResolver;
      name = userAddress;
    }

    if (!userAddress.includes(".")) {
      ethers.utils.getAddress(userAddress);

      name = await provider.lookupAddress(userAddress);

      address = userAddress;
    }

    if (name) {
      avatar = await provider.getAvatar(name);
      const resolver = await provider.getResolver(name);
      resolver.getText("com.twitter");
    }

    return { address, name, avatar };
  } catch (error) {
    console.error(error);
    return {};
  }
};

export const getTexts = async (name: string) => {
  const mainnetEndpoint =
    "https://speedy-nodes-nyc.moralis.io/d35afcfb3d409232f26629cd/eth/mainnet";
  const rpcProvider = new ethers.providers.JsonRpcProvider(mainnetEndpoint);
  const provider = !(window as any).ethereum
    ? rpcProvider
    : new ethers.providers.Web3Provider(window.ethereum);

  const resolver = await provider.getResolver(name);
  const twitterURL = await resolver.getText("vnd.twitter");
  const discordURL = await resolver.getText("com.discord");
  const URL = await resolver.getText("url");
  return {
    twitterURL,
    discordURL,
    URL,
  };
};

export const getAllEnsLinked = async (address: string) => {
  const headers = {
    "content-type": "application/json",
  };
  const ensGraphURL = "https://api.thegraph.com/subgraphs/name/ensdomains/ens";
  const graphqlQuery = {
    operationName: "fetchEns",
    // variables: {},
    query: `query fetchEns {
          domains(where:{owner:"${address}"}){
            name
            labelName
            id      
          }
        }
    `,
  };

  const res = await axios({
    url: ensGraphURL,
    method: "POST",
    data: graphqlQuery,
    headers,
  });

  if (!!res.data?.errors?.length) {
    throw new Error("Error fetching ens domains");
  }

  return res.data;
};

export const ipfs = create({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
});

export const contract = () => {
  const { ethereum } = window;
  if (ethereum) {
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    const contractReader = new ethers.Contract(
      "0x7ca28EfFf78f9edEc4E8c87F9C50B03d4F00Ff3d",
      DaoFactory,
      signer
    );
    return contractReader;
  }

  return null;
};

export const daoContract = (address: string) => {
  const { ethereum } = window;
  if (ethereum) {
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    const contractReader = new ethers.Contract(
      address,
      InstaDao,
      signer
    );
    return contractReader;
  }

  return null;
};

export const uploadImageToIPFS = async (fileSource: string) => {
  try {
    const { cid } = await ipfs.add(urlSource(fileSource) as any);

    return `https://ipfs.io/ipfs/${cid.toString()}`;
  } catch (error) {
    console.error(error);
  }
};

export const getDAOForENS = async (name: string) => {
  const headers = {
    "content-type": "application/json",
  };
  const ensGraphURL =
    "https://api.thegraph.com/subgraphs/name/anoushk1234/insta-dao";
  const graphqlQuery = {
    operationName: "getDAO",
    // variables: {},
    query: `query getDAO {
          tokenEntities(where:{ensName: "${name.toLowerCase()}"}) {
              id
              count
              tokenaddress
              creator
              name
              ensName
              metadata
              symbol
              totalSupply 
              decimals
            }
        }
    `,
  };

  const res = await axios({
    url: ensGraphURL,
    method: "POST",
    data: graphqlQuery,
    headers,
  });

  if (!!res.data?.errors?.length) {
    throw new Error("Error fetching ens domains");
  }

  return res.data;
};

export const getDAODetails = async (name: string) => {
  const headers = {
    "content-type": "application/json",
  };
  const ensGraphURL =
    "https://api.thegraph.com/subgraphs/name/anoushk1234/insta-dao";
  const graphqlQuery = {
    operationName: "getDAO",
    // variables: {},
    query: `query getDAO {
          tokenEntities(where:{name: "${name}"}) {
              id
              count
              tokenaddress
              creator
              name
              ensName
              metadata
              symbol
              totalSupply 
              decimals
            }
        }
    `,
  };

  const res = await axios({
    url: ensGraphURL,
    method: "POST",
    data: graphqlQuery,
    headers,
  });

  if (!!res.data?.errors?.length) {
    throw new Error("Error fetching ens domains");
  }

  return res.data.data.tokenEntities[0];
};

export const getTokenTransferDetails = async (tokenaddress: string) => {
  const headers = {
    "content-type": "application/json",
  };
  const ensGraphURL =
    "https://api.thegraph.com/subgraphs/name/anoushk1234/insta-dao";
  const graphqlQuery = {
    operationName: "getTokenTransferDetails",
    // variables: {},
    query: `query getTokenTransferDetails {
           tokenTransferEntities(where: {tokenaddress: "${tokenaddress}"}) {
              id
              count
              tokenaddress
              to
              amt
            }
            manualTransferEntities(where: {tokenaddress: "${tokenaddress}"}){
              id
              count
              from
              to
              tokenaddress
              amt
            }
        }
    `,
  };

  const res = await axios({
    url: ensGraphURL,
    method: "POST",
    data: graphqlQuery,
    headers,
  });

  if (!!res.data?.errors?.length) {
    throw new Error("Error fetching ens domains");
  }

  const tokenTransferEntities = res.data.data.tokenTransferEntities;
  const manualTransferEntities = res.data.data.manualTransferEntities;

  return [
    ...tokenTransferEntities.filter(
      (value) =>
        manualTransferEntities.findIndex((m) => m.id === value.id) === -1
    ),
    ...manualTransferEntities,
  ];
};

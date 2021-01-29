import { utils } from "ethers";

export const isAddress = (address: string) => {
    try {
        utils.getAddress(address);
    } catch (e) { return false; }
    return true;
}
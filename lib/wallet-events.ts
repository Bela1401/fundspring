export const OPEN_WALLET_MENU_EVENT = "fundspring:open-wallet-menu";

export function requestWalletConnection(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_WALLET_MENU_EVENT));
  }
}

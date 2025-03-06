"use client";

import { useEffect, useState, useCallback } from "react";
import sdk from "@farcaster/frame-sdk";
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useBalance,
} from "wagmi";
import Image from "next/image";
import { parseUnits, formatUnits, BaseError } from "viem";
import qs from "qs";

import { Button } from "~/components/ui/Button";
import { truncateAddress } from "~/lib/truncateAddress";
import { QuoteResponse } from "~/lib/types/zeroex";

interface Token {
  symbol: string;
  name: string;
  image: string;
  address: string;
  decimals: number;
}

const ETH = {
  symbol: "ETH",
  name: "Ethereum",
  image: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  decimals: 18,
};

const DEMO_TOKENS: Token[] = [
  {
    symbol: "USDC",
    name: "USD Coin",
    image:
      "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
    address: "0x3801672b93E16A25120995b7201add19dC46fA22",
    decimals: 6,
  },
  {
    symbol: "DON",
    name: "DON",
    image: "/COMING SOON (2).png",
    address: "0x3801672b93E16A25120995b7201add19dC46fA22",
    decimals: 18,
  },
];

const AFFILIATE_FEE = 25;
const PROTOCOL_GUILD_ADDRESS = "0x32e3C7fD24e175701A35c224f2238d18439C7dBC";

export default function TokenSwap({ token }: { token: string }) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);

  const sellToken = ETH;
  const [sellAmount, setSellAmount] = useState("");

  const [buyAmount, setBuyAmount] = useState("");
  const [buyToken, setBuyToken] = useState<Token>(
    token === "clanker" ? DEMO_TOKENS[1] : DEMO_TOKENS[0]
  );

  const [isFinalized, setIsFinalized] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse>();

  const [fetchPriceError, setFetchPriceError] = useState<string[]>([]);

  const { address, isConnected } = useAccount();
  
  // Add balance hooks
  const { data: ethBalance } = useBalance({
    address,
  });

  const parsedSellAmount = sellAmount
    ? parseUnits(sellAmount, sellToken.decimals).toString()
    : undefined;

  const parsedBuyAmount = buyAmount
    ? parseUnits(buyAmount, buyToken.decimals).toString()
    : undefined;

  const [isPriceLoading, setIsPriceLoading] = useState(false);

  const {
    data: hash,
    isPending,
    error,
    sendTransaction,
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  useEffect(() => {
    const load = async () => {
      sdk.actions.ready();
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  const finalize = useCallback(() => {
    setIsFinalized(true);
  }, []);

  const fetchPrice = useCallback(
    async (params: unknown) => {
      setIsPriceLoading(true);
      try {
        const response = await fetch(`/api/price?${qs.stringify(params)}`);
        const data = await response.json();

        if (data?.validationErrors?.length > 0) {
          setFetchPriceError(data.validationErrors);
        } else {
          setFetchPriceError([]);
        }

        if (data.buyAmount) {
          setBuyAmount(formatUnits(data.buyAmount, buyToken.decimals));
        }
      } finally {
        setIsPriceLoading(false);
      }
    },
    [buyToken.decimals, setBuyAmount, setFetchPriceError]
  );

  const linkToBaseScan = useCallback((hash?: string) => {
    if (hash) {
      sdk.actions.openUrl(`https://basescan.org/tx/${hash}`);
    }
  }, []);

  const fetchQuote = useCallback(
    async (params: unknown) => {
      setIsPriceLoading(true);
      try {
        const response = await fetch(`/api/quote?${qs.stringify(params)}`);
        const data = await response.json();
        setQuote(data);
      } finally {
        setIsPriceLoading(false);
      }
    },
    [setIsPriceLoading, setQuote]
  );

  const executeSwap = useCallback(() => {
    if (quote) {
      try {
        console.log("Executing swap with quote:", quote);
        
        // Check if we're in a Farcaster Frame environment
        const isFrameEnvironment = typeof window !== 'undefined' && 
          window.location.href.includes('warpcast.com');
        
        if (isFrameEnvironment) {
          // In Farcaster Frame, open a link to complete the transaction
          const baseUrl = "https://app.uniswap.org/swap";
          const params = new URLSearchParams({
            inputCurrency: sellToken.address,
            outputCurrency: buyToken.address,
            exactAmount: sellAmount,
            exactField: 'input'
          });
          
          const swapUrl = `${baseUrl}?${params.toString()}`;
          console.log("Opening external swap URL:", swapUrl);
          sdk.actions.openUrl(swapUrl);
          return;
        }
        
        // Otherwise proceed with normal transaction
        sendTransaction({
          gas: quote.transaction.gas ? BigInt(quote.transaction.gas) : undefined,
          to: quote.transaction.to,
          data: quote.transaction.data,
          value: BigInt(quote.transaction.value),
          chainId: 8453 // Explicitly set the chain ID for Base
        });
      } catch (error) {
        console.error("Error executing swap:", error);
        // Display a more user-friendly error
        const errorMessage = error instanceof Error ? error.message : "Unknown error during swap";
        setFetchPriceError([errorMessage]);
      }
    }
  }, [quote, sendTransaction, setFetchPriceError, sellToken.address, buyToken.address, sellAmount, sdk.actions]);

  useEffect(() => {
    const params = {
      chainId: 8453,
      sellToken: ETH.address,
      buyToken: buyToken.address,
      sellAmount: parsedSellAmount,
      buyAmount: parsedBuyAmount,
      taker: address,
      swapFeeRecipient: PROTOCOL_GUILD_ADDRESS,
      swapFeeBps: AFFILIATE_FEE,
      swapFeeToken: buyToken.address,
      tradeSurplusRecipient: PROTOCOL_GUILD_ADDRESS,
    };

    const timeoutId = setTimeout(() => {
      if (sellAmount !== "") {
        const fetchFn = isFinalized ? fetchQuote : fetchPrice;
        fetchFn(params);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [
    address,
    buyAmount,
    buyToken.address,
    parsedBuyAmount,
    parsedSellAmount,
    sellAmount,
    isFinalized,
    fetchPrice,
    fetchQuote,
  ]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-[300px] mx-auto py-4 px-2">
      <div className="mb-4 space-y-2">
        {address && (
          <>
            <div className="text-sm text-gray-500 text-right flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Wallet:</span>
              <span>{truncateAddress(address)}</span>
            </div>
            <div className="text-sm text-right flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Balance:</span>
              <span>{ethBalance?.formatted || '0'} {ethBalance?.symbol}</span>
            </div>
          </>
        )}
      </div>

      <div className="space-y-4">
        {/* Sell Token Input */}
        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-gray-400">You Pay</label>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              placeholder="0.0"
              className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800"
            />
            <div className="absolute right-2 top-2 flex items-center gap-2 bg-white dark:bg-gray-700 px-2 py-1 rounded-md">
              <Image
                src={ETH.image}
                alt={ETH.symbol}
                width={100}
                height={100}
                className="w-6 h-6 rounded-full"
              />
              <div className="bg-transparent border-none outline-none">
                {ETH.symbol}
              </div>
            </div>
            {ethBalance && (
              <div className="absolute left-2 -bottom-6 text-xs text-gray-500">
                Max: {ethBalance.formatted} {ethBalance.symbol}
              </div>
            )}
          </div>
        </div>

        {/* Buy Token Input */}
        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-gray-400">You Receive</label>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              placeholder="0.0"
              className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800"
            />
            {isPriceLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-md pl-4 bg-gray-100/50 dark:bg-gray-800/50">
                <div className="w-4 h-4 border-2 border-[#7C65C1] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="absolute right-2 top-2 flex items-center gap-2 bg-white dark:bg-gray-700 px-2 py-1 rounded-md">
              <Image
                src={buyToken.image}
                alt={buyToken.symbol}
                width={100}
                height={100}
                className="w-6 h-6 rounded-full"
              />
              <select
                value={buyToken.symbol}
                onChange={(e) =>
                  setBuyToken(
                    DEMO_TOKENS.find((t) => t.symbol === e.target.value) ||
                      DEMO_TOKENS[1]
                  )
                }
                className="bg-transparent border-none outline-none dark:text-white"
              >
                {DEMO_TOKENS.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {quote && (
          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Minimum received:</span>
              <span>{formatUnits(BigInt(quote.minBuyAmount), buyToken.decimals)} {buyToken.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Network:</span>
              <span>Base</span>
            </div>
          </div>
        )}

        <Button
          onClick={isFinalized ? executeSwap : finalize}
          disabled={!isConnected || !sellAmount || !buyAmount || isPending}
          className="w-full"
        >
          {!isConnected 
            ? "Connect Wallet" 
            : isPending 
              ? "Confirming..." 
              : isFinalized 
                ? "Confirm Swap" 
                : "Review Swap"}
        </Button>

        {isConfirming && (
          <div className="text-orange-500 text-center mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            ⏳ Waiting for confirmation...
          </div>
        )}
        {isConfirmed && (
          <div
            className="text-green-500 text-center mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg cursor-pointer"
            onClick={() => linkToBaseScan(hash)}
          >
            <p>🎉 Transaction Confirmed!</p>
            <p className="text-sm">Tap to View on Basescan</p>
          </div>
        )}

        {fetchPriceError.length > 0 && (
          <div className="text-red-500 text-sm mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            {fetchPriceError.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </div>
        )}
        {error && (
          <div className="text-red-500 text-sm mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            Error: {(error as BaseError).shortMessage || error.message}
          </div>
        )}
      </div>
    </div>
  );
}

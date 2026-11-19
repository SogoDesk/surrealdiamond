"use client";

/**
 * "Added to your cart" (client feedback, November 2026): after Add to cart on
 * a store card, in Quick View or on the product page, a popup names the piece
 * and offers Go to Cart or Continue Shopping. It replaces Buy now. Mounted
 * once in the root layout; it opens on the CART_POPUP event from lib/cart.ts
 * and reads the line from the cart, so it always shows what was really added.
 * Escape, the backdrop and Continue Shopping all close it.
 */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatCarat, metals, productById, renderSrc } from "@/content/catalog";
import { account } from "@/content/site";
import { CART_POPUP, useCart } from "@/lib/cart";
import s from "./AddedToCartPopup.module.css";

export default function AddedToCartPopup() {
  const [key, setKey] = useState<string | null>(null);
  const cart = useCart();
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onAdded = (e: Event) => setKey((e as CustomEvent<string>).detail);
    window.addEventListener(CART_POPUP, onAdded);
    return () => window.removeEventListener(CART_POPUP, onAdded);
  }, []);

  useEffect(() => {
    if (!key) return;
    continueRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setKey(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [key]);

  const line = key ? cart.find((l) => l.key === key) : undefined;
  const product = line ? productById(line.productId) : undefined;
  if (!key || !line || !product) return null;

  const metal = metals.find((m) => m.id === line.metal)?.label ?? "";
  const close = () => setKey(null);

  return (
    <div className={s.root}>
      <div className={s.backdrop} onClick={close} />
      <div className={s.card} role="dialog" aria-modal="true" aria-labelledby="added-title">
        <button type="button" className={s.close} onClick={close} aria-label="Close">
          <svg aria-hidden viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <path d="M3 3l10 10M13 3 3 13" />
          </svg>
        </button>
        <div className={s.head}>
          <span className={s.tick} aria-hidden>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 8.5 3.2 3.2L13 5" />
            </svg>
          </span>
          <h2 id="added-title" className={s.title}>
            Added to your cart
          </h2>
        </div>
        <div className={s.item}>
          <span className={s.thumb}>
            <Image src={renderSrc(product.variants?.[line.metal] ?? product.image)} alt="" width={160} height={160} sizes="72px" />
          </span>
          <span className={s.text}>
            <strong>{product.name}</strong>
            <span>
              {metal}, {formatCarat(line.carat)}
            </span>
            <span>Quantity in cart: {line.qty}</span>
          </span>
        </div>
        <div className={s.actions}>
          <Link href={account.cart} className={s.primary} onClick={close}>
            Go to Cart
          </Link>
          <button ref={continueRef} type="button" className={s.secondary} onClick={close}>
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}

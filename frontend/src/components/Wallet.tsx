import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CHAIN, explorerAddress, explorerTx } from "../config";
import { shortAddr, weiToGen } from "../lib/format";
import { useCopy } from "../lib/hooks";
import { useTxHistory } from "../lib/tx";
import { chainName, closeConnect, closeNetwork, connect, disconnect, onRightChain, openConnect, openNetwork, rescanWallets, switchNetwork, useWallet } from "../lib/wallet";
import Icon from "./Icon";
import { Button, Modal, Notice } from "./ui";
import { Ring } from "./Spinner";

const WALLET_LINKS = [
  { name: "MetaMask", url: "https://metamask.io/download/" },
  { name: "Rabby", url: "https://rabby.io/" },
  { name: "Rainbow", url: "https://rainbow.me/" },
];

export function WalletButton() {
  const w = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, copy] = useCopy();
  const box = useRef<HTMLDivElement>(null);
  const history = useTxHistory();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (w.status === "disconnected" || w.status === "connecting") {
    return (
      <Button variant="primary" size="md" icon="wallet" busy={w.status === "connecting"} onClick={openConnect}>
        {w.status === "connecting" ? "Connecting…" : "Connect wallet"}
      </Button>
    );
  }

  const wrong = !onRightChain(w);
  return (
    <div className="walletmenu" ref={box}>
      <button className={`walletpill ${wrong ? "is-wrong" : ""}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        {w.wallet && <img src={w.wallet.icon} alt="" width={20} height={20} />}
        <span className="walletpill__addr">{shortAddr(w.account ?? "", 6, 4)}</span>
        {wrong ? <span className="walletpill__warn" title="Wrong network"><Icon name="alert" size={14} /></span> : <span className="walletpill__bal">{weiToGen(w.balance ?? 0n, 3)} <small>GEN</small></span>}
        <Icon name="chevron" size={14} />
      </button>
      {open && (
        <div className="walletmenu__panel" role="menu">
          <div className="walletmenu__head">
            {w.wallet && <img src={w.wallet.icon} alt="" width={30} height={30} />}
            <div>
              <strong>{w.wallet?.name}</strong>
              <span>{wrong ? <b className="danger">Wrong network</b> : <b className="ok">● {CHAIN.name}</b>}</span>
            </div>
          </div>
          <div className="walletmenu__addr">
            <code>{w.account}</code>
            <button className="iconbtn" onClick={() => w.account && copy(w.account)} aria-label="Copy address"><Icon name={copied ? "check" : "copy"} size={15} /></button>
            <a className="iconbtn" href={explorerAddress(w.account ?? "")} target="_blank" rel="noopener noreferrer" aria-label="Open in explorer"><Icon name="external" size={15} /></a>
          </div>
          {wrong ? (
            <div className="walletmenu__warn">
              <p>Your wallet is on <b>{chainName(w.chainId)}</b>. Cairn runs on {CHAIN.name}.</p>
              <Button size="sm" variant="primary" busy={w.switching} onClick={() => { setOpen(false); switchNetwork().then((ok) => { if (!ok) openNetwork(); }); }}>Switch network</Button>
            </div>
          ) : (
            <div className="walletmenu__row"><span>Balance</span><strong>{weiToGen(w.balance ?? 0n, 6)} GEN</strong></div>
          )}
          {history.length > 0 && (
            <div className="walletmenu__tx">
              <span className="eyebrow">Recent transactions</span>
              {history.slice(0, 4).map((h) => (
                <a key={h.hash} href={explorerTx(h.hash)} target="_blank" rel="noopener noreferrer">
                  <i className={`dot dot--${h.status}`} />
                  <span>{h.label}</span>
                  <small>{shortAddr(h.hash, 6, 4)}</small>
                </a>
              ))}
            </div>
          )}
          <div className="walletmenu__actions">
            <Link className="menuitem" to="/me" onClick={() => setOpen(false)}><Icon name="layers" size={16} /> My pools</Link>
            <button className="menuitem" onClick={() => { setOpen(false); openConnect(); }}><Icon name="wallet" size={16} /> Switch wallet</button>
            <button className="menuitem menuitem--danger" onClick={() => { setOpen(false); disconnect(); }}><Icon name="power" size={16} /> Disconnect</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function WalletModal() {
  const w = useWallet();
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => { if (w.status !== "connecting") setPending(null); }, [w.status]);

  return (
    <Modal open={w.connectOpen} onClose={closeConnect} title="Connect a wallet" icon={<span className="modal__icon"><Icon name="wallet" size={20} /></span>}>
      <p className="modal__lead">Choose the wallet you want to use with Cairn. Wallets found in your browser appear below (EIP-6963), so you pick exactly the one you mean.</p>
      {w.providers.length > 0 ? (
        <ul className="walletlist">
          {w.providers.map((p) => {
            const isThis = w.status === "connected" && w.wallet?.uuid === p.info.uuid;
            return (
              <li key={p.info.uuid}>
                <button
                  className="walletlist__item"
                  disabled={w.status === "connecting"}
                  onClick={() => { setPending(p.info.uuid); connect(p.info.uuid); }}
                >
                  <img src={p.info.icon} alt="" width={36} height={36} />
                  <span className="walletlist__name"><b>{p.info.name}</b><small>{p.info.rdns}</small></span>
                  {pending === p.info.uuid && w.status === "connecting" ? <Ring size={18} /> : isThis ? <span className="tag tag--green">Connected</span> : <Icon name="arrow" size={16} />}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="nowallet">
          {!w.discovered ? (
            <p><Ring size={14} /> Looking for wallets in this browser…</p>
          ) : (
            <>
              <Notice tone="warn" title="No wallet found in this browser">
                Install a browser wallet, then press “Look again”. Cairn works with any wallet that supports EIP-6963 or the standard injected provider.
              </Notice>
              <div className="nowallet__links">
                {WALLET_LINKS.map((l) => <a key={l.name} className="btn btn--soft btn--sm" href={l.url} target="_blank" rel="noopener noreferrer"><span>{l.name}</span><Icon name="external" size={14} /></a>)}
              </div>
            </>
          )}
        </div>
      )}
      {w.error && <Notice tone="error">{w.error}</Notice>}
      <div className="modal__foot">
        <Button variant="quiet" size="sm" icon="refresh" onClick={rescanWallets}>Look again</Button>
        <span className="muted small">After connecting you will be asked to use {CHAIN.name} (chain {CHAIN.id}).</span>
      </div>
    </Modal>
  );
}

/** Shown when the wallet is connected to another network: says what is wrong and fixes it with one click. */
export function NetworkModal() {
  const w = useWallet();
  const open = w.networkOpen && w.status === "connected" && !onRightChain(w);
  return (
    <Modal open={open} onClose={closeNetwork} title="Switch to GenLayer Studionet" icon={<span className="modal__icon modal__icon--warn"><Icon name="globe" size={20} /></span>}>
      <div className="netswitch">
        <div className="netswitch__pair">
          <div className="netswitch__chain is-bad"><small>Your wallet</small><b>{chainName(w.chainId)}</b></div>
          <Icon name="arrow" size={22} />
          <div className="netswitch__chain is-good"><small>Cairn needs</small><b>{CHAIN.name}</b></div>
        </div>
        <p>Cairn lives on GenLayer Studionet (chain id {CHAIN.id}). Your wallet is on a different network, so transactions would go to the wrong place. Press the button and approve the request in your wallet — if the network is missing it will be added for you.</p>
        {w.error && <Notice tone="error">{w.error}</Notice>}
        <div className="modal__actions">
          <Button variant="primary" size="lg" busy={w.switching} onClick={() => switchNetwork()}>Switch to {CHAIN.name}</Button>
          <Button variant="quiet" size="lg" onClick={closeNetwork}>Not now</Button>
        </div>
        <dl className="netswitch__details">
          <div><dt>Network name</dt><dd>{CHAIN.name}</dd></div>
          <div><dt>Chain ID</dt><dd>{CHAIN.id} ({CHAIN.hex})</dd></div>
          <div><dt>RPC URL</dt><dd>{CHAIN.rpc}</dd></div>
          <div><dt>Currency</dt><dd>{CHAIN.currency.symbol}</dd></div>
        </dl>
      </div>
    </Modal>
  );
}

export function NetworkBanner() {
  const w = useWallet();
  if (w.status !== "connected" || onRightChain(w)) return null;
  return (
    <div className="netbanner" role="alert">
      <Icon name="alert" size={18} />
      <span>Your wallet is on <b>{chainName(w.chainId)}</b>. Switch to <b>{CHAIN.name}</b> to use Cairn.</span>
      <Button size="sm" variant="primary" busy={w.switching} onClick={() => switchNetwork().then((ok) => { if (!ok) openNetwork(); })}>Switch network</Button>
    </div>
  );
}

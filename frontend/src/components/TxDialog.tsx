import { useEffect, useState } from "react";
import { explorerTx } from "../config";
import { shortAddr } from "../lib/format";
import { dismissTx, expandTx, minimizeTx, useTx } from "../lib/tx";
import Icon from "./Icon";
import { Ring, StoneLoader } from "./Spinner";
import { Button, Modal } from "./ui";

function useElapsed(from: number, running: boolean, until: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [running]);
  const end = running ? now : until || now;
  return Math.max(0, Math.floor((end - from) / 1000));
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

type StepState = "todo" | "active" | "done" | "fail";

export default function TxDialog() {
  const tx = useTx();
  const pending = tx.stage === "wallet" || tx.stage === "consensus";
  const elapsed = useElapsed(tx.startedAt, pending, tx.finishedAt);

  if (tx.stage === "idle" || !tx.spec) return null;

  const steps: { label: string; detail?: string; state: StepState }[] = [
    { label: "Confirm in your wallet", detail: "Check the amount, then sign.", state: tx.stage === "wallet" ? "active" : tx.stage === "rejected" ? "fail" : tx.hash || tx.stage === "failed" && tx.hash ? "done" : tx.stage === "failed" ? "fail" : "done" },
    { label: "Sent to GenLayer", detail: tx.hash ? shortAddr(tx.hash, 10, 8) : undefined, state: tx.hash ? "done" : "todo" },
    { label: tx.spec.slow ? "Validators ask the AI and agree" : "Validators reach consensus", detail: tx.spec.slow ? "A judgement reads a web page and asks a model — this can take a few minutes." : undefined, state: tx.stage === "consensus" ? "active" : tx.stage === "done" ? "done" : tx.stage === "failed" && tx.hash ? "fail" : "todo" },
    { label: "Done", state: tx.stage === "done" ? "done" : "todo" },
  ];

  const title = tx.stage === "done" ? "Done" : tx.stage === "failed" ? "The call did not go through" : tx.stage === "rejected" ? "Request rejected" : tx.spec.label;

  if (tx.minimized && pending) {
    return (
      <button className="txpill" onClick={expandTx} aria-label="Show the pending transaction">
        <Ring size={16} />
        <span>{tx.spec.label}</span>
        <small>{fmt(elapsed)}</small>
      </button>
    );
  }

  return (
    <Modal open={tx.open} onClose={dismissTx} locked={pending} title={title} icon={<span className={`modal__icon ${tx.stage === "done" ? "modal__icon--ok" : tx.stage === "failed" || tx.stage === "rejected" ? "modal__icon--bad" : ""}`}><Icon name={tx.stage === "done" ? "check" : tx.stage === "failed" || tx.stage === "rejected" ? "alert" : "zap"} size={20} /></span>}>
      <div className="txdialog">
        <div className="txdialog__visual">
          {pending ? <StoneLoader size={96} label="Waiting for the network" /> : tx.stage === "done" ? <div className="txdialog__ok"><Icon name="check" size={46} /></div> : <div className="txdialog__bad"><Icon name="alert" size={46} /></div>}
          {pending && <span className="txdialog__time">{fmt(elapsed)}</span>}
        </div>
        <ol className="steps">
          {steps.map((s, i) => (
            <li key={i} className={`steps__item is-${s.state}`}>
              <span className="steps__dot">{s.state === "done" ? <Icon name="check" size={12} /> : s.state === "fail" ? <Icon name="close" size={12} /> : s.state === "active" ? <Ring size={12} /> : i + 1}</span>
              <span><b>{s.label}</b>{s.detail && <small>{s.detail}</small>}</span>
            </li>
          ))}
        </ol>
        {tx.spec.note && pending && <p className="txdialog__note">{tx.spec.note}</p>}
        {tx.error && <p className={`txdialog__msg ${tx.stage === "done" ? "" : "is-error"}`} role="alert">{tx.error}</p>}
        <div className="modal__actions">
          {tx.hash && <a className="btn btn--soft btn--md" href={explorerTx(tx.hash)} target="_blank" rel="noopener noreferrer"><Icon name="external" size={16} /><span>View in explorer</span></a>}
          {pending ? <Button variant="quiet" onClick={minimizeTx}>Hide — keep working</Button> : <Button variant="primary" onClick={dismissTx}>{tx.stage === "done" ? "Great" : "Close"}</Button>}
        </div>
      </div>
    </Modal>
  );
}

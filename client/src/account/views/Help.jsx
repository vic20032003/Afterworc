import { useState } from 'react';
import { useApp } from '../store.jsx';
import { Ic } from '../../shared/icons.jsx';
import { t } from '../../shared/i18n.js';
import { Head } from '../ui.jsx';

const FAQ = [
  ['When is my money released?', 'When the client accepts a delivery, or automatically 7 days after delivery if the client does nothing. Released money is on your Working balance at once.'],
  ['What does "Checked in person" mean?', "A person on our team verified the specialist's identity, tested their skills, called two references and interviewed them live. The profile shows who checked and when."],
  ['How do departments get invoiced?', 'One VAT invoice per month for the whole team, issued when you fund the month.'],
  ['How does hiring abroad (EOR) work?', 'We become the legal employer in the person’s country: contract, payroll, taxes, benefits and on-time pay. You direct the work and get one monthly invoice.'],
  ['What if I disagree with a delivery?', "Request changes with specifics; the review clock restarts on resubmission. If you still can't agree, open an issue on the deal and we mediate within 2 business days."],
  ['How does the AfterWorc card work?', 'It spends from your Available balance only. Held deal money is never touched. Freeze it, set limits and switch ATM and online payments on or off in Money › Card.'],
  ['My card was declined. Why?', "Check that the card isn't frozen, that the channel (online, contactless, ATM, abroad) is switched on, that you are within your limits, and that Available covers the payment."],
  ['Calls do not connect. What can I do?', 'Allow the microphone (and camera) for afterworc.com in your browser, and make sure the other person is online. On strict office networks a call may need a TURN server: tell technical support.']
];
const TOPICS = ['A deal or payment', 'My brief or shortlist', 'Hiring abroad (EOR)', 'Getting checked', 'The AfterWorc card', 'A technical problem', 'My account', 'Something else'];

export default function Help() {
  const { act, busy, mode } = useApp();
  const [topic, setTopic] = useState(TOPICS[0]);
  const [text, setText] = useState('');
  return (<>
    <Head title={t('Help & support')} sub={t('A person answers within one business day.')} right={<button className="btn ghost sm" onClick={() => act('tech_open', { mode })}><Ic n="gear" s={15} />{t('Chat with technical support')}</button>} />
    <div className="split"><div className="card">
      <label className="field"><span>{t('What is it about?')}</span><select className="inp" value={topic} onChange={e => setTopic(e.target.value)}>{TOPICS.map(x => <option key={x} value={x}>{t(x)}</option>)}</select></label>
      <label className="field"><span>{t('Tell us more')}</span><textarea className="inp" id="help-text" maxLength={4000} value={text} onChange={e => setText(e.target.value)} /></label>
      <p className="muted tiny" style={{ marginBottom: 12 }}>{t("We attach your account reference automatically, so you don't have to find it. The reply arrives in Messages and by e-mail.")} {topic === 'A technical problem' && t('Technical questions go to the technical support chat.')}</p>
      <button className="btn g" disabled={busy} onClick={async () => { const r = await act('help_send', { topic, text }); if (r) setText(''); }}>{t('Send')}</button></div>
      <div className="stack sticky"><div className="card faqs"><h3 style={{ marginBottom: 6 }}>{t('Quick answers')}</h3>{FAQ.map(([q, a]) => <details key={q}><summary>{t(q)}</summary><p>{t(a)}</p></details>)}</div>
        <div className="card small"><b>{t('E-mail')}</b><p className="muted" style={{ marginTop: 4 }}>info@afterworc.com</p></div></div></div>
  </>);
}

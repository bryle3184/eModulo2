import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Check,
  Download,
  Eye,
  Lock,
  ScrollText,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import { ProgressBar, Ring, Spinner, Modal, CheckMark } from '../components/ui';
import { formatDate } from '../lib';

interface Requirement {
  key: string;
  label: string;
  detail: string;
  done: boolean;
}

interface CertificateInfo {
  id: number;
  code: string;
  level: string;
  levelLabel: string;
  issuedAt: string;
  recipient: string;
  title: string;
  programme: string;
  hours: number;
}

interface CertificateData {
  level: string;
  levelLabel: string;
  eligible: boolean;
  requirements: Requirement[];
  completedRequirements: number;
  totalRequirements: number;
  certificates: CertificateInfo[];
  allLevels: { level: string; label: string; eligible: boolean; issued: boolean }[];
  module: { lessons: number; estimatedHours: number };
}

export function CertificatePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<CertificateData | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<CertificateInfo | null>(null);

  const load = () => api.get<CertificateData>('/certificate').then(setData);

  useEffect(() => {
    void load();
  }, []);

  const issue = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const res = await api.post<{ certificate: CertificateInfo; alreadyIssued: boolean }>('/certificate/issue', {
        level: data.level,
      });
      await load();
      setPreview(res.certificate);
      toast.success(res.alreadyIssued ? 'Certificate already issued' : 'Certificate issued', `ID ${res.certificate.code}`);
    } catch (err) {
      toast.error('Certificate not ready', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <Spinner label="Checking your certificate…" />;

  const pct = Math.round((data.completedRequirements / data.totalRequirements) * 100);
  const name = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.email || 'Learner';
  const currentCert = data.certificates.find((c) => c.level === data.level);
  const eligible = data.eligible;

  return (
    <div className="page-in">
      <div className="page-head">
        <div>
          <div className="eyebrow"><ScrollText size={13} /> Certification</div>
          <h1>Your certificate</h1>
          <p>
            Certificates are issued only when every requirement has genuinely been met on this account. Each
            difficulty level has its own checklist.
          </p>
        </div>
        <span className="chip chip-primary">{data.levelLabel} level</span>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <section className="card card-pad">
          <div className="row between gap-12">
            <div>
              <h3>Eligibility checklist</h3>
              <p className="tiny muted mt-4">{data.completedRequirements} of {data.totalRequirements} requirements met</p>
            </div>
            <Ring value={pct} size={64} stroke={6} label={<span style={{ fontWeight: 800, fontSize: 12 }}>{pct}%</span>} />
          </div>

          <div className="checklist mt-16">
            {data.requirements.map((r) => (
              <div key={r.key} className={`check-item ${r.done ? 'done' : ''}`}>
                <CheckMark done={r.done} />
                <div>
                  <div className="check-label">{r.label}</div>
                  <div className="check-detail">{r.detail}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-20">
            <ProgressBar value={pct} size="lg" />
          </div>

          <div className="row gap-10 wrap mt-20">
            {currentCert ? (
              <>
                <a className="btn btn-primary" href={`/api/certificates/${currentCert.code}/pdf`}>
                  <Download size={15} /> Download PDF
                </a>
                <button className="btn btn-outline" onClick={() => setPreview(currentCert)}>
                  <Eye size={15} /> View certificate
                </button>
              </>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={issue} disabled={!eligible || busy}>
                {busy ? 'Issuing…' : eligible ? 'Issue my certificate' : 'Requirements not met yet'}
                {!eligible && <Lock size={15} />}
              </button>
            )}
            {!eligible && (
              <Link to="/activities" className="btn btn-ghost">Close the gaps</Link>
            )}
          </div>
          {!eligible && (
            <p className="tiny muted mt-8">
              The button unlocks automatically once every requirement above is checked. Nothing is issued early.
            </p>
          )}
        </section>

        <section>
          <div className="cert-preview">
            <div className="cert-kicker">eMódulo · Learn object-oriented programming</div>
            <div className="cert-title">Certificate of Completion</div>
            <div className="cert-line">This certifies that</div>
            <div className="cert-name">{name}</div>
            <div className="cert-line">has successfully completed the eMódulo programme</div>
            <div className="cert-prog">Object-Oriented Programming with C++</div>
            <div className="cert-line mt-8" style={{ fontSize: '0.76rem' }}>
              Encapsulation · Abstraction · Inheritance · Polymorphism — {data.levelLabel} track
            </div>
            <div className="cert-code">
              {currentCert ? `CERTIFICATE ID ${currentCert.code}` : `ID ASSIGNED WHEN ISSUED · ${data.module.lessons} LESSONS · ~${data.module.estimatedHours}H`}
            </div>
          </div>

          <div className="card mt-16">
            <div className="card-head"><h3>Certificate status by level</h3></div>
            <div>
              {data.allLevels.map((l) => (
                <div className="rowline" key={l.level}>
                  <span className={`dot ${l.issued ? 'dot-success' : l.eligible ? 'dot-warning' : ''}`} />
                  <span className="grow" style={{ fontWeight: 600, fontSize: '0.86rem' }}>{l.label}</span>
                  {l.issued ? (
                    <span className="chip chip-success"><Check size={12} /> Issued</span>
                  ) : l.eligible ? (
                    <span className="chip chip-warning">Eligible</span>
                  ) : (
                    <span className="chip"><Lock size={11} /> Locked</span>
                  )}
                  {l.level !== data.level && (
                    <Link to="/difficulties" className="tiny" style={{ color: 'var(--primary)', fontWeight: 650 }}>
                      Switch
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {data.certificates.length > 0 && (
        <section className="card mt-20">
          <div className="card-head">
            <h3>Issued certificates</h3>
            <span className="chip"><Trophy size={12} /> {data.certificates.length}</span>
          </div>
          <div className="card-pad stack gap-10">
            {data.certificates.map((c) => (
              <div className="certificate-issued" key={c.id}>
                <div className="empty-icon" style={{ width: 44, height: 44, borderRadius: 13 }}>
                  <Award size={19} />
                </div>
                <div className="grow">
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.levelLabel} certificate</div>
                  <div className="tiny muted">Issued {formatDate(c.issuedAt)} · {c.code}</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => setPreview(c)}>
                  <Eye size={14} /> View
                </button>
                <a className="btn btn-primary btn-sm" href={`/api/certificates/${c.code}/pdf`}>
                  <Download size={14} /> PDF
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="alert alert-info small mt-20">
        <Sparkles size={15} />
        Certificates are verifiable by their unique ID. The PDF is generated server-side from your account record, so
        it cannot be produced until the checklist is complete.
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Certificate" width={720}>
        {preview && (
          <div className="stack gap-16">
            <div className="cert-preview">
              <div className="cert-kicker">eMódulo · Learn object-oriented programming</div>
              <div className="cert-title">{preview.title}</div>
              <div className="cert-line">This certifies that</div>
              <div className="cert-name">{preview.recipient}</div>
              <div className="cert-line">has successfully completed</div>
              <div className="cert-prog">{preview.programme}</div>
              <div className="cert-line mt-8" style={{ fontSize: '0.8rem' }}>
                {preview.levelLabel} track · Issued {formatDate(preview.issuedAt)}
              </div>
              <div className="cert-code">CERTIFICATE ID {preview.code}</div>
            </div>
            <div className="row gap-10 wrap">
              <a className="btn btn-primary" href={`/api/certificates/${preview.code}/pdf`}>
                <Download size={15} /> Download PDF
              </a>
              <button className="btn btn-outline" onClick={() => setPreview(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

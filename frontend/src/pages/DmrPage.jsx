import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ClipboardCheck, Truck, Fuel, Wrench, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "../api/Api";

const DmrPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    odometer: "",
    fuel_level: "Half",
    cleanliness: "Clean",
    issues: "",
    vehicle_no: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/attendance/dmr-submit", form);
      toast.success("Maintenance Report Submitted");
      navigate("/dashboard");
    } catch (err) {
      toast.error("Submission Failed");
    } finally {
      setLoading(false);
    }
  };
return (
    <div className="dmr-container">
      <style>{`
        /* --- THEME VARIABLES (Light Mode) --- */
        :root {
          --primary: #0062cc;       /* Patra Blue */
          --bg-body: #f8f9fa;       /* Very Light Grey Body */
          --bg-surface: #ffffff;    /* White Cards */
          --border: #e2e8f0;        /* Light Border */
          --text-main: #1a1a1a;     /* Dark Text */
          --text-muted: #64748b;    /* Slate Grey */
          --input-bg: #ffffff;      /* White Inputs */
        }

        body{ margin: 0; }
        .dmr-container { 
            min-height: 100dvh; 
            background: var(--bg-body); 
            color: var(--text-main); 
            font-family: 'Inter', sans-serif; 
        }
        
        .dmr-header { 
            height: 60px; 
            background: rgba(255,255,255,0.9); 
            backdrop-filter: blur(10px); 
            display: flex; 
            align-items: center; 
            padding: 0 16px; 
            border-bottom: 1px solid var(--border); 
            position: sticky; 
            top: 0; 
            z-index: 10; 
        }
        
        .dmr-form { 
            padding: 10px; 
            max-width: 500px; 
            margin: 0 auto; 
        }
        
        .form-card { 
            background: var(--bg-surface); 
            border-radius: 20px; 
            padding: 20px; 
            border: 1px solid var(--border); 
            margin-bottom: 20px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.03);
        }
        
        .input-group { margin-bottom: 20px; }
        .input-group label { 
            display: flex; 
            align-items: center; 
            gap: 6px;
            font-size: 11px; 
            font-weight: 800; 
            color: var(--primary); 
            margin-bottom: 8px; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
        }
        
        .dmr-input { 
            width: 100%; 
            background: var(--input-bg); 
            border: 1px solid var(--border); 
            padding: 14px; 
            border-radius: 12px; 
            color: var(--text-main); 
            outline: none; 
            box-sizing: border-box; 
            font-size: 14px;
            font-weight: 500;
            transition: 0.2s;
        }
        .dmr-input:focus { 
            border-color: var(--primary); 
            box-shadow: 0 0 0 3px rgba(0, 98, 204, 0.1);
        }
        
        .select-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        
        .choice-btn { 
            background: #f1f5f9; 
            border: 1px solid #e2e8f0; 
            padding: 12px; 
            border-radius: 12px; 
            font-size: 12px; 
            cursor: pointer; 
            color: #64748b; 
            font-weight: 700; 
            text-align: center;
            transition: 0.2s;
        }
        
        .choice-btn.active { 
            background: #eff6ff; 
            border-color: var(--primary); 
            color: var(--primary); 
            box-shadow: 0 2px 5px rgba(0, 98, 204, 0.1);
        }
        
        .btn-submit { 
            width: 100%; 
            background: var(--primary); 
            color: #fff; 
            border: none; 
            padding: 16px; 
            border-radius: 16px; 
            font-weight: 800; 
            margin-top: 10px; 
            box-shadow: 0 8px 20px rgba(0, 98, 204, 0.25); 
            cursor: pointer;
            transition: 0.2s;
        }
        .btn-submit:active { transform: scale(0.98); }
        .btn-submit:disabled { background: #cbd5e1; box-shadow: none; cursor: not-allowed; }
      `}</style>


      <form className="dmr-form" onSubmit={handleSubmit}>
        <div className="form-card">
          <div className="input-group">
            <label><Truck size={16} /> Vehicle Registration No</label>
            <input 
              className="dmr-input" 
              placeholder="e.g. OR-02-AX-1234" 
              value={form.vehicle_no}
              onChange={(e) => setForm({...form, vehicle_no: e.target.value.toUpperCase()})}
              required
            />
          </div>

          <div className="input-group">
            <label>Current Odometer (KM)</label>
            <input 
              type="number" 
              className="dmr-input" 
              placeholder="Enter current reading" 
              value={form.odometer}
              onChange={(e) => setForm({...form, odometer: e.target.value})}
              required
            />
          </div>
        </div>

        <div className="form-card">
          <div className="input-group">
            <label><Fuel size={16} /> Fuel Level</label>
            <div className="select-grid">
              {['Low', 'Half', 'Full'].map(lvl => (
                <div 
                  key={lvl} 
                  className={`choice-btn ${form.fuel_level === lvl ? 'active' : ''}`}
                  onClick={() => setForm({...form, fuel_level: lvl})}
                >
                  {lvl}
                </div>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label>Vehicle Cleanliness</label>
            <div className="select-grid">
              {['Dirty', 'Average', 'Clean'].map(cln => (
                <div 
                  key={cln} 
                  className={`choice-btn ${form.cleanliness === cln ? 'active' : ''}`}
                  onClick={() => setForm({...form, cleanliness: cln})}
                >
                  {cln}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="form-card">
          <div className="input-group">
            <label><Wrench size={16} /> Any Mechanical Issues?</label>
            <textarea 
              className="dmr-input" 
              rows="3" 
              placeholder="Type issue if any..." 
              value={form.issues}
              onChange={(e) => setForm({...form, issues: e.target.value})}
            />
          </div>
        </div>

        <button className="btn-submit" type="submit" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={24} /> : "SUBMIT REPORT"}
        </button>
      </form>
    </div>
  );
};

export default DmrPage;
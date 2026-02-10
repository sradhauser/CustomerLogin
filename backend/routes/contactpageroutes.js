import express from 'express';
const router = express.Router();

router.get("/contact-details", (req, res) => {
  const contactConfig = {
    whatsapp: {
      number: "918337911111",
      label: "Chat with Operations",
      link: "https://wa.me/918337911111",
    },
    primary_support: {
      phone: "+91 83379 11111",
      email: "operations@patratravels.com",
    },
    emergency: {
      number: "112",
      title: "Emergency / Breakdown",
      subtitle: "24/7 Priority Assistance",
    },
    offices: [
      {
        id: 1,
        name: "Operations Center (BBS)",
        type: "Driver Support",
        address: "Tankapani Rd, near Ravi Talkies Road, Siba Nagar, Brahmeswarpatna, Bhubaneswar, Odisha 751018",
        map_url: "https://maps.app.goo.gl/HHuCGSHFBErDtLDo6?g_st=ic",
        color: "primary",
      },
      {
        id: 2,
        name: "Sales Head Office (BBS)",
        type: "Admin Office",
        address: "1st Floor, Royal Palace Campus, Plot No. 1151, Tankapani Rd, Bhubaneswar, Odisha 751018",
        map_url: "https://maps.app.goo.gl/gYJ2Zn1JBuxnKtog7?g_st=ic",
        color: "dark",
      },
      {
        id: 3,
        name: "Puri Branch",
        type: "Regional Hub",
        address: "PLOT NO. 1129/5095, Puri-Konark Marine Drive, Baliguali, Puri, Odisha 752004",
        map_url: "https://maps.app.goo.gl/Uc7skghpjcMji4u77?g_st=ic",
        color: "info",
      },
    ],
  };

  res.status(200).json({ success: true, data: contactConfig });
});

export default router;
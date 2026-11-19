
const currentYear = new Date().getFullYear();

function Footer() {

  return (
    <footer className="footer">

      {/* Left Section */}
      <div className="footer-left">
        <p>
          © {currentYear} <strong>Studora</strong>.
          All rights reserved.
        </p>
      </div>

      {/* Right Section */}
      <div className="footer-right">
        <a href="#privacy">Privacy Policy</a>
        <a href="#terms">Terms & Conditions</a>
        <a href="#help">Help & Support</a>
      </div>

    </footer>
  );
}

export default Footer;

import React, { useState, useEffect, useRef } from 'react';
import './TermsModal.css';

const TermsModal = ({ 
  isOpen, 
  open,
  onClose, 
  onAccept, 
  onDecline, 
  type = 'noticeBoard',
  alreadyAccepted = false 
}) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const contentRef = useRef(null);

  // Support both isOpen and open prop names for compatibility
  const modalIsOpen = isOpen || open;

  // Check if content needs scrolling on mount and when modal opens
  useEffect(() => {
    if (modalIsOpen && contentRef.current) {
      // Use setTimeout to ensure DOM is fully rendered
      setTimeout(() => {
        const { scrollHeight, clientHeight } = contentRef.current;
        const needsScrolling = scrollHeight > clientHeight + 10; // 10px tolerance
        
        if (!needsScrolling) {
          // If content doesn't need scrolling, allow immediate acceptance
          setHasScrolledToBottom(true);
        } else {
          // Reset scroll state for scrollable content
          setHasScrolledToBottom(false);
        }
      }, 100);
    }
  }, [modalIsOpen]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20; // 20px tolerance for easier detection
    setHasScrolledToBottom(isAtBottom);
  };

  const handleAccept = async () => {
    try {
      setIsAccepting(true);
      await onAccept();
    } catch (error) {
      console.error('Error accepting terms:', error);
      // Handle error - could show a toast notification
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = () => {
    onDecline();
  };

  const getTermsContent = () => {
    if (type === 'noticeBoard') {
      return {
        title: 'Notice Board Terms and Conditions',
        content: `
          <h3>Community Notice Board Guidelines</h3>
          
          <p>By posting on the community notice board, you agree to the following terms and conditions:</p>
          
          <h4>1. Prohibited Content</h4>
          <ul>
            <li><strong>No Solicitation:</strong> Commercial advertising, business promotion, or selling of goods and services is strictly prohibited.</li>
            <li><strong>No Spam:</strong> Repetitive, irrelevant, or unsolicited content is not allowed.</li>
            <li><strong>No Inappropriate Content:</strong> Content that is offensive, discriminatory, threatening, or inappropriate for a community setting is prohibited.</li>
            <li><strong>No Misinformation:</strong> False, misleading, or unverified information that could harm the community is not allowed.</li>
          </ul>
          
          <h4>2. Acceptable Use</h4>
          <ul>
            <li><strong>Community Events:</strong> Information about local community events, meetings, and gatherings.</li>
            <li><strong>Lost and Found:</strong> Posts about lost or found items within the neighbourhood.</li>
            <li><strong>Community Announcements:</strong> Important information relevant to neighbourhood residents.</li>
            <li><strong>Neighbourhood Updates:</strong> Information about local developments, road closures, or community improvements.</li>
          </ul>
          
          <h4>3. Content Standards</h4>
          <ul>
            <li>Keep posts relevant to the local community</li>
            <li>Use clear, respectful language</li>
            <li>Include accurate contact information when appropriate</li>
            <li>Respect privacy and confidentiality</li>
          </ul>
          
          <h4>4. Moderation</h4>
          <p>Community moderators and administrators reserve the right to:</p>
          <ul>
            <li>Remove posts that violate these guidelines</li>
            <li>Edit posts for clarity or compliance</li>
            <li>Suspend or ban users who repeatedly violate terms</li>
            <li>Take appropriate action to maintain community standards</li>
          </ul>
          
          <h4>5. Liability</h4>
          <p>Users are responsible for the accuracy and legality of their posts. The platform is not liable for user-generated content or any consequences arising from posted information.</p>
          
          <h4>6. Privacy</h4>
          <p>Do not share personal information of others without consent. Be mindful of your own privacy when posting contact details or personal information.</p>
          
          <p><strong>By clicking "Accept", you acknowledge that you have read, understood, and agree to comply with these terms and conditions.</strong></p>
        `
      };
    } else if (type === 'report' || type === 'reports') {
      return {
        title: 'Community Reports Terms and Conditions',
        content: `
          <h3>Community Safety Reports Guidelines</h3>
          
          <p>By submitting a community safety report, you agree to the following terms and conditions:</p>
          
          <h4>1. Report Requirements</h4>
          <ul>
            <li><strong>Factual Information:</strong> All reports must contain accurate, factual information to the best of your knowledge.</li>
            <li><strong>Relevant Sources:</strong> When possible, include sources, evidence, or references to support your report.</li>
            <li><strong>Clear Description:</strong> Provide clear, detailed descriptions of incidents or concerns.</li>
            <li><strong>Appropriate Evidence:</strong> Include photos, videos, or documents only if legally obtained and relevant.</li>
          </ul>
          
          <h4>2. Prohibited Reports</h4>
          <ul>
            <li><strong>False Reports:</strong> Knowingly submitting false, misleading, or fabricated information is strictly prohibited.</li>
            <li><strong>Defamatory Content:</strong> Reports that unfairly damage someone's reputation without factual basis are not allowed.</li>
            <li><strong>Personal Disputes:</strong> Use appropriate channels for personal conflicts rather than community reports.</li>
            <li><strong>Non-Safety Issues:</strong> Reports should focus on genuine safety, security, or community welfare concerns.</li>
          </ul>
          
          <h4>3. Appropriate Report Types</h4>
          <ul>
            <li><strong>Safety Hazards:</strong> Dangerous conditions, broken infrastructure, or environmental hazards</li>
            <li><strong>Security Concerns:</strong> Suspicious activities, security breaches, or safety threats</li>
            <li><strong>Community Issues:</strong> Problems affecting neighbourhood welfare or quality of life</li>
            <li><strong>Emergency Situations:</strong> Urgent matters requiring immediate community attention</li>
          </ul>
          
          <h4>4. Evidence and Documentation</h4>
          <ul>
            <li>Include timestamps and locations when relevant</li>
            <li>Provide witness information if available and consented</li>
            <li>Attach supporting documentation when appropriate</li>
            <li>Respect privacy laws when including photos or videos</li>
          </ul>
          
          <h4>5. Legal Considerations</h4>
          <ul>
            <li><strong>Emergency Services:</strong> For immediate emergencies, contact appropriate emergency services first</li>
            <li><strong>Legal Compliance:</strong> Ensure all reports comply with local laws and regulations</li>
            <li><strong>Confidentiality:</strong> Respect confidential information and privacy rights</li>
            <li><strong>Cooperation:</strong> Be prepared to cooperate with authorities if required</li>
          </ul>
          
          <h4>6. Review and Action</h4>
          <p>Community moderators and administrators will:</p>
          <ul>
            <li>Review all reports for accuracy and appropriateness</li>
            <li>Take appropriate action based on report severity</li>
            <li>Forward reports to relevant authorities when necessary</li>
            <li>Maintain confidentiality as appropriate</li>
          </ul>
          
          <h4>7. Liability and Responsibility</h4>
          <p>Report submitters are responsible for:</p>
          <ul>
            <li>The accuracy and truthfulness of their reports</li>
            <li>Compliance with all applicable laws</li>
            <li>Respecting others' privacy and rights</li>
            <li>Using the reporting system responsibly</li>
          </ul>
          
          <p><strong>By clicking "Accept", you acknowledge that you have read, understood, and agree to comply with these reporting guidelines and accept responsibility for the accuracy of your submissions.</strong></p>
        `
      };
    }
    
    return {
      title: 'Terms and Conditions',
      content: '<p>Please contact support for terms and conditions.</p>'
    };
  };

  // Don't show modal if already accepted or not open
  if (alreadyAccepted || !modalIsOpen) {
    return null;
  }

  const { title, content } = getTermsContent();

  return (
    <div className="terms-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="terms-modal">
        <div className="terms-modal-header">
          <h2>{title}</h2>
          <button 
            className="terms-modal-close" 
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        <div 
          className="terms-modal-content"
          onScroll={handleScroll}
          ref={contentRef}
        >
          <div 
            className="terms-content"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
        
        <div className="terms-modal-footer">
          <div className="terms-scroll-indicator">
            {!hasScrolledToBottom && (
              <div>
                <p className="scroll-reminder">
                  📜 Please scroll to the bottom to read all terms and enable the Accept button
                </p>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    if (contentRef.current) {
                      contentRef.current.scrollTop = contentRef.current.scrollHeight;
                    }
                  }}
                  style={{ marginTop: '8px', fontSize: '0.85rem', padding: '6px 12px' }}
                >
                  Skip to Bottom ⬇️
                </button>
              </div>
            )}
          </div>
          
          <div className="terms-modal-actions">
            <button 
              className="btn btn-secondary"
              onClick={handleDecline}
              disabled={isAccepting}
            >
              Decline
            </button>
            <button 
              className={`btn btn-primary ${!hasScrolledToBottom ? 'disabled' : ''}`}
              onClick={handleAccept}
              disabled={!hasScrolledToBottom || isAccepting}
              title={!hasScrolledToBottom ? 'Please scroll to the bottom to enable this button' : ''}
            >
              {isAccepting ? 'Accepting...' : !hasScrolledToBottom ? 'Scroll to Accept' : 'Accept & Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
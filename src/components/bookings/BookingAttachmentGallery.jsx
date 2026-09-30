import { useState } from 'react'

function ImagePreviewModal({ altText, imageUrl, title, onClose }) {
  return (
    <div className="hw-booking-image-preview-backdrop" role="presentation" onClick={onClose}>
      <div
        className="hw-booking-image-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="hw-booking-image-preview-header">
          <strong>{title}</strong>
          <button type="button" onClick={onClose}>×</button>
        </div>
        {imageUrl ? (
          <img alt={altText} src={imageUrl} />
        ) : (
          <p>Preview is unavailable for this attachment.</p>
        )}
      </div>
    </div>
  )
}

export default function BookingAttachmentGallery({ attachments = [], label = 'Uploaded issue photos', previews = [], onRemove }) {
  const [selectedAttachment, setSelectedAttachment] = useState(null)

  if (!attachments.length) {
    return null
  }

  const isFormPreview = typeof onRemove === 'function'

  return (
    <div className="hw-booking-attachment-gallery">
      <strong>{label}</strong>
      <div className="hw-booking-attachment-grid">
        {attachments.map((attachment, index) => {
          const fileUrl = isFormPreview ? previews[index]?.url : attachment.fileUrl
          const fileName = isFormPreview ? attachment.name : attachment.fileName
          const key = isFormPreview ? `${attachment.name}-${attachment.size}-${index}` : (attachment.id || attachment.filePath)

          if (isFormPreview) {
            return (
              <div className="hw-booking-preview-card" key={key}>
                {fileUrl ? (
                  <img alt={fileName} src={fileUrl} />
                ) : (
                  <span>{fileName}</span>
                )}
                <button type="button" onClick={() => onRemove(index)}>
                  ×
                </button>
                <small>{fileName}</small>
              </div>
            )
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedAttachment(attachment)}
            >
              {fileUrl ? (
                <img alt={fileName} src={fileUrl} />
              ) : (
                <span>{fileName}</span>
              )}
            </button>
          )
        })}
      </div>
      {selectedAttachment && !isFormPreview && (
        <ImagePreviewModal
          altText={selectedAttachment.fileName}
          imageUrl={selectedAttachment.fileUrl}
          title={selectedAttachment.fileName}
          onClose={() => setSelectedAttachment(null)}
        />
      )}
    </div>
  )
}

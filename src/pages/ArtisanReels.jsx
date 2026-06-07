import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import {
  createReelUpload,
  deleteReel,
  getReelsForArtisanProfile,
  updateReelDetails,
} from '../services/reelsService.js'
import { getServiceOptions } from '../services/serviceService.js'
import { showToast } from '../utils/toast.js'

const initialForm = {
  caption: '',
  serviceId: '',
  status: 'draft',
  thumbnailFile: null,
  videoFile: null,
}

const maxVideoSize = 50 * 1024 * 1024
const maxThumbnailSize = 5 * 1024 * 1024

function getErrorMessage(error) {
  return [
    error.message,
    error.details,
    error.hint,
    error.code,
  ].filter(Boolean).join(' ')
}

function validateVideo(file) {
  if (!file) {
    return 'Choose a work video to upload.'
  }

  if (!file.type.startsWith('video/')) {
    return 'Please upload a valid video file.'
  }

  if (file.size > maxVideoSize) {
    return 'Video is too large. Keep reels under 50MB for now.'
  }

  return ''
}

function validateThumbnail(file) {
  if (!file) {
    return ''
  }

  if (!file.type.startsWith('image/')) {
    return 'Thumbnail must be an image file.'
  }

  if (file.size > maxThumbnailSize) {
    return 'Thumbnail is too large. Keep thumbnails under 5MB.'
  }

  return ''
}

function ArtisanReels() {
  const { user } = useAuth()
  const [artisan, setArtisan] = useState(null)
  const [editingReelId, setEditingReelId] = useState('')
  const [editForms, setEditForms] = useState({})
  const [error, setError] = useState('')
  const [form, setForm] = useState(initialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [reels, setReels] = useState([])
  const [services, setServices] = useState([])
  const [updatingReelId, setUpdatingReelId] = useState('')

  async function loadPage() {
    await Promise.resolve()
    setError('')
    setIsLoading(true)

    try {
      const [reelsResult, servicesResult] = await Promise.all([
        getReelsForArtisanProfile(user.id),
        getServiceOptions(),
      ])

      if (reelsResult.error || servicesResult.error) {
        setError(getErrorMessage(reelsResult.error || servicesResult.error))
      }

      setArtisan(reelsResult.data.artisan)
      setReels(reelsResult.data.reels)
      setServices(servicesResult.data)
      setForm((currentForm) => ({
        ...currentForm,
        serviceId: currentForm.serviceId || reelsResult.data.artisan?.primaryService?.id || servicesResult.data[0]?.id || '',
      }))
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(loadPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  function updateForm(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  function updateEditForm(reelId, field, value) {
    setEditForms((currentForms) => ({
      ...currentForms,
      [reelId]: {
        ...currentForms[reelId],
        [field]: value,
      },
    }))
  }

  function startEditing(reel) {
    setEditingReelId(reel.id)
    setEditForms((currentForms) => ({
      ...currentForms,
      [reel.id]: {
        caption: reel.caption,
        serviceId: reel.serviceId,
        status: reel.status,
      },
    }))
  }

  async function handleUpload(event) {
    event.preventDefault()
    setError('')

    if (!artisan?.id) {
      setError('Create your artisan profile before uploading reels.')
      return
    }

    const videoError = validateVideo(form.videoFile)
    const thumbnailError = validateThumbnail(form.thumbnailFile)

    if (videoError || thumbnailError) {
      setError(videoError || thumbnailError)
      return
    }

    setIsUploading(true)

    try {
      const { data, error: uploadError } = await createReelUpload({
        artisanId: artisan.id,
        caption: form.caption,
        profileId: user.id,
        serviceId: form.serviceId,
        status: form.status,
        thumbnailFile: form.thumbnailFile,
        videoFile: form.videoFile,
      })

      if (uploadError) {
        setError(getErrorMessage(uploadError))
        return
      }

      setReels((currentReels) => [data, ...currentReels])
      setForm({
        ...initialForm,
        serviceId: form.serviceId,
      })
      event.currentTarget.reset()
      showToast('Reel uploaded successfully.')
    } catch (uploadError) {
      setError(getErrorMessage(uploadError))
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSaveReel(reel) {
    const editForm = editForms[reel.id]
    setError('')
    setUpdatingReelId(reel.id)

    try {
      const { data, error: updateError } = await updateReelDetails({
        caption: editForm.caption,
        reelId: reel.id,
        serviceId: editForm.serviceId,
        status: editForm.status,
      })

      if (updateError) {
        setError(getErrorMessage(updateError))
        return
      }

      setReels((currentReels) => (
        currentReels.map((currentReel) => currentReel.id === reel.id ? data : currentReel)
      ))
      setEditingReelId('')
      showToast('Reel updated.')
    } catch (updateError) {
      setError(getErrorMessage(updateError))
    } finally {
      setUpdatingReelId('')
    }
  }

  async function handleStatusChange(reel, status) {
    setError('')
    setUpdatingReelId(reel.id)

    try {
      const { data, error: updateError } = await updateReelDetails({
        caption: reel.caption,
        reelId: reel.id,
        serviceId: reel.serviceId,
        status,
      })

      if (updateError) {
        setError(getErrorMessage(updateError))
        return
      }

      setReels((currentReels) => (
        currentReels.map((currentReel) => currentReel.id === reel.id ? data : currentReel)
      ))
      showToast(status === 'published' ? 'Reel published.' : 'Reel moved to draft.')
    } catch (updateError) {
      setError(getErrorMessage(updateError))
    } finally {
      setUpdatingReelId('')
    }
  }

  async function handleDelete(reel) {
    setError('')
    setUpdatingReelId(reel.id)

    try {
      const { error: deleteError } = await deleteReel(reel)

      if (deleteError) {
        setError(getErrorMessage(deleteError))
        return
      }

      setReels((currentReels) => currentReels.filter((currentReel) => currentReel.id !== reel.id))
      showToast('Reel deleted.')
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    } finally {
      setUpdatingReelId('')
    }
  }

  if (isLoading) {
    return (
      <div className="starter-page artisan-reels-page">
        <SkeletonPreview count={3} label="Loading artisan reels" type="reel" />
      </div>
    )
  }

  if (!artisan) {
    return (
      <div className="starter-page artisan-reels-page">
        <EmptyState
          action={<Button className="primary-cta" to="/artisan-onboarding">Create Artisan Profile</Button>}
          title="Create your artisan profile first"
        >
          Your reels are connected to your artisan profile.
        </EmptyState>
        {error && <p className="auth-error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="starter-page artisan-reels-page">
      <section className="page-hero compact">
        <p className="section-kicker">Artisan reels</p>
        <h1>Upload short work videos</h1>
        <p>Show customers your process, finished work, and proof of skill with short Handiwave reels.</p>
      </section>

      {error && <p className="auth-error page-error">{error}</p>}

      <section className="artisan-reels-layout">
        <form className="booking-form reel-upload-form" onSubmit={handleUpload}>
          <h2>Upload a reel</h2>
          <label>
            Work video
            <input
              accept="video/*"
              disabled={isUploading}
              type="file"
              onChange={(event) => updateForm('videoFile', event.target.files?.[0] || null)}
            />
          </label>
          <label>
            Thumbnail image optional
            <input
              accept="image/*"
              disabled={isUploading}
              type="file"
              onChange={(event) => updateForm('thumbnailFile', event.target.files?.[0] || null)}
            />
          </label>
          <label>
            Service
            <select
              disabled={isUploading}
              value={form.serviceId}
              onChange={(event) => updateForm('serviceId', event.target.value)}
            >
              <option value="">Choose a service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              disabled={isUploading}
              value={form.status}
              onChange={(event) => updateForm('status', event.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
          <label>
            Caption
            <textarea
              disabled={isUploading}
              placeholder="Example: Rewired a Lekki apartment safely in one afternoon."
              value={form.caption}
              onChange={(event) => updateForm('caption', event.target.value)}
            />
          </label>
          <button disabled={isUploading} type="submit">
            {isUploading ? 'Uploading reel...' : 'Upload Reel'}
          </button>
          <p className="auth-hint">Videos must be under 50MB. Thumbnails must be under 5MB.</p>
        </form>

        <section className="artisan-reel-list">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">My reels</p>
              <h2>{reels.length} upload{reels.length === 1 ? '' : 's'}</h2>
            </div>
          </div>

          {reels.length > 0 ? (
            <div className="artisan-reel-grid">
              {reels.map((reel) => {
                const editForm = editForms[reel.id] || {
                  caption: reel.caption,
                  serviceId: reel.serviceId,
                  status: reel.status,
                }

                return (
                  <article className="artisan-reel-card" key={reel.id}>
                    <video
                      controls
                      muted
                      playsInline
                      poster={reel.thumbnailUrl || undefined}
                      src={reel.videoUrl}
                    />
                    {editingReelId === reel.id ? (
                      <div className="artisan-reel-edit">
                        <label>
                          Service
                          <select
                            value={editForm.serviceId}
                            onChange={(event) => updateEditForm(reel.id, 'serviceId', event.target.value)}
                          >
                            <option value="">Choose a service</option>
                            {services.map((service) => (
                              <option key={service.id} value={service.id}>{service.name}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Status
                          <select
                            value={editForm.status}
                            onChange={(event) => updateEditForm(reel.id, 'status', event.target.value)}
                          >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                          </select>
                        </label>
                        <label>
                          Caption
                          <textarea
                            value={editForm.caption}
                            onChange={(event) => updateEditForm(reel.id, 'caption', event.target.value)}
                          />
                        </label>
                      </div>
                    ) : (
                      <div>
                        <span className={`reel-status-pill ${reel.status}`}>{reel.status}</span>
                        <h3>{reel.service}</h3>
                        <p>{reel.caption}</p>
                        <small>{reel.views} views • {reel.likes} likes</small>
                      </div>
                    )}
                    <div className="reel-management-actions">
                      {editingReelId === reel.id ? (
                        <>
                          <button
                            disabled={updatingReelId === reel.id}
                            type="button"
                            onClick={() => handleSaveReel(reel)}
                          >
                            Save
                          </button>
                          <button type="button" onClick={() => setEditingReelId('')}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => startEditing(reel)}>
                            Edit
                          </button>
                          <button
                            disabled={updatingReelId === reel.id}
                            type="button"
                            onClick={() => handleStatusChange(reel, reel.status === 'published' ? 'draft' : 'published')}
                          >
                            {reel.status === 'published' ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            disabled={updatingReelId === reel.id}
                            type="button"
                            onClick={() => handleDelete(reel)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <EmptyState compact title="No reels yet">
              Upload your first work video to start building trust with customers.
            </EmptyState>
          )}
        </section>
      </section>
    </div>
  )
}

export default ArtisanReels

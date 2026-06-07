import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import {
  addAvailabilitySlot,
  addUnavailableDate,
  dayOptions,
  deleteAvailabilitySlot,
  deleteUnavailableDate,
  getAvailabilityForArtisanProfile,
  updateAvailabilitySlotStatus,
} from '../services/availabilityService.js'
import { showToast } from '../utils/toast.js'

const initialSlotForm = {
  dayOfWeek: '1',
  endTime: '17:00',
  startTime: '09:00',
}

const initialDateForm = {
  reason: '',
  unavailableDate: '',
}

function getErrorMessage(error) {
  return [
    error.message,
    error.details,
    error.hint,
    error.code,
  ].filter(Boolean).join(' ')
}

function ArtisanAvailability() {
  const { user } = useAuth()
  const [artisan, setArtisan] = useState(null)
  const [dateForm, setDateForm] = useState(initialDateForm)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingDate, setIsSavingDate] = useState(false)
  const [isSavingSlot, setIsSavingSlot] = useState(false)
  const [slotForm, setSlotForm] = useState(initialSlotForm)
  const [slots, setSlots] = useState([])
  const [unavailableDates, setUnavailableDates] = useState([])
  const [updatingId, setUpdatingId] = useState('')

  const activeSlots = useMemo(() => (
    slots.filter((slot) => slot.isActive)
  ), [slots])

  useEffect(() => {
    let isMounted = true

    getAvailabilityForArtisanProfile(user.id)
      .then(({ data, error: availabilityError }) => {
        if (!isMounted) {
          return
        }

        if (availabilityError) {
          setError(getErrorMessage(availabilityError))
          return
        }

        setArtisan(data.artisan)
        setSlots(data.slots)
        setUnavailableDates(data.unavailableDates)
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(getErrorMessage(loadError))
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [user.id])

  function updateSlotForm(field, value) {
    setSlotForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  function updateDateForm(field, value) {
    setDateForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  async function handleAddSlot(event) {
    event.preventDefault()
    setError('')

    if (!artisan?.id) {
      setError('Create your artisan profile before adding availability.')
      return
    }

    if (slotForm.startTime >= slotForm.endTime) {
      setError('Start time must be earlier than end time.')
      return
    }

    setIsSavingSlot(true)

    try {
      const { data, error: saveError } = await addAvailabilitySlot({
        artisanId: artisan.id,
        dayOfWeek: slotForm.dayOfWeek,
        endTime: slotForm.endTime,
        startTime: slotForm.startTime,
      })

      if (saveError) {
        setError(getErrorMessage(saveError))
        return
      }

      setSlots((currentSlots) => [...currentSlots, data].sort((first, second) => (
        first.dayOfWeek - second.dayOfWeek || first.startTime.localeCompare(second.startTime)
      )))
      showToast('Availability slot added.')
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setIsSavingSlot(false)
    }
  }

  async function handleToggleSlot(slot) {
    setError('')
    setUpdatingId(slot.id)

    try {
      const { data, error: updateError } = await updateAvailabilitySlotStatus({
        isActive: !slot.isActive,
        slotId: slot.id,
      })

      if (updateError) {
        setError(getErrorMessage(updateError))
        return
      }

      setSlots((currentSlots) => (
        currentSlots.map((currentSlot) => (
          currentSlot.id === slot.id ? data : currentSlot
        ))
      ))
      showToast(data.isActive ? 'Slot activated.' : 'Slot paused.')
    } catch (updateError) {
      setError(getErrorMessage(updateError))
    } finally {
      setUpdatingId('')
    }
  }

  async function handleDeleteSlot(slotId) {
    setError('')
    setUpdatingId(slotId)

    try {
      const { error: deleteError } = await deleteAvailabilitySlot(slotId)

      if (deleteError) {
        setError(getErrorMessage(deleteError))
        return
      }

      setSlots((currentSlots) => currentSlots.filter((slot) => slot.id !== slotId))
      showToast('Availability slot deleted.')
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    } finally {
      setUpdatingId('')
    }
  }

  async function handleAddUnavailableDate(event) {
    event.preventDefault()
    setError('')

    if (!artisan?.id) {
      setError('Create your artisan profile before blocking dates.')
      return
    }

    if (!dateForm.unavailableDate) {
      setError('Choose a date to block.')
      return
    }

    setIsSavingDate(true)

    try {
      const { data, error: saveError } = await addUnavailableDate({
        artisanId: artisan.id,
        reason: dateForm.reason,
        unavailableDate: dateForm.unavailableDate,
      })

      if (saveError) {
        setError(getErrorMessage(saveError))
        return
      }

      setUnavailableDates((currentDates) => [...currentDates, data].sort((first, second) => (
        first.unavailableDate.localeCompare(second.unavailableDate)
      )))
      setDateForm(initialDateForm)
      showToast('Unavailable date added.')
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setIsSavingDate(false)
    }
  }

  async function handleDeleteUnavailableDate(dateId) {
    setError('')
    setUpdatingId(dateId)

    try {
      const { error: deleteError } = await deleteUnavailableDate(dateId)

      if (deleteError) {
        setError(getErrorMessage(deleteError))
        return
      }

      setUnavailableDates((currentDates) => (
        currentDates.filter((date) => date.id !== dateId)
      ))
      showToast('Unavailable date removed.')
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    } finally {
      setUpdatingId('')
    }
  }

  if (isLoading) {
    return (
      <div className="starter-page artisan-dashboard-page">
        <SkeletonPreview count={4} label="Loading availability" type="service" />
      </div>
    )
  }

  if (!artisan) {
    return (
      <div className="starter-page artisan-dashboard-page">
        <EmptyState
          action={<Button className="primary-cta" to="/artisan-onboarding">Create Artisan Profile</Button>}
          title="Create your artisan profile first"
        >
          Your availability calendar is connected to your artisan profile.
        </EmptyState>
        {error && <p className="auth-error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="starter-page artisan-dashboard-page">
      <section className="page-hero compact">
        <p className="section-kicker">Availability</p>
        <h1>Set your weekly calendar</h1>
        <p>
          Add the days and times customers can book you, then block off dates
          when you are unavailable.
        </p>
      </section>

      {error && <p className="auth-error page-error">{error}</p>}

      <section className="summary-grid">
        <div><strong>{activeSlots.length}</strong><span>Active slots</span></div>
        <div><strong>{slots.length - activeSlots.length}</strong><span>Paused slots</span></div>
        <div><strong>{unavailableDates.length}</strong><span>Blocked dates</span></div>
      </section>

      <section className="availability-layout">
        <form className="booking-form availability-form" onSubmit={handleAddSlot}>
          <h2>Add weekly slot</h2>
          <label>
            Day
            <select
              disabled={isSavingSlot}
              value={slotForm.dayOfWeek}
              onChange={(event) => updateSlotForm('dayOfWeek', event.target.value)}
            >
              {dayOptions.map((day) => (
                <option key={day.value} value={day.value}>{day.label}</option>
              ))}
            </select>
          </label>
          <div className="form-split">
            <label>
              Start time
              <input
                disabled={isSavingSlot}
                type="time"
                value={slotForm.startTime}
                onChange={(event) => updateSlotForm('startTime', event.target.value)}
              />
            </label>
            <label>
              End time
              <input
                disabled={isSavingSlot}
                type="time"
                value={slotForm.endTime}
                onChange={(event) => updateSlotForm('endTime', event.target.value)}
              />
            </label>
          </div>
          <button disabled={isSavingSlot} type="submit">
            {isSavingSlot ? 'Saving slot...' : 'Add Availability Slot'}
          </button>
        </form>

        <form className="booking-form availability-form" onSubmit={handleAddUnavailableDate}>
          <h2>Block a date</h2>
          <label>
            Unavailable date
            <input
              disabled={isSavingDate}
              type="date"
              value={dateForm.unavailableDate}
              onChange={(event) => updateDateForm('unavailableDate', event.target.value)}
            />
          </label>
          <label>
            Reason
            <input
              disabled={isSavingDate}
              placeholder="Optional, e.g. family event"
              value={dateForm.reason}
              onChange={(event) => updateDateForm('reason', event.target.value)}
            />
          </label>
          <button disabled={isSavingDate} type="submit">
            {isSavingDate ? 'Saving date...' : 'Add Unavailable Date'}
          </button>
        </form>
      </section>

      <section className="availability-layout wide">
        <article className="artisan-profile-panel">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Weekly slots</p>
              <h2>Your bookable hours</h2>
            </div>
          </div>
          {slots.length > 0 ? (
            <div className="availability-list">
              {slots.map((slot) => (
                <div className={slot.isActive ? 'availability-row' : 'availability-row inactive'} key={slot.id}>
                  <div>
                    <strong>{slot.dayLabel}</strong>
                    <span>{slot.startTime} - {slot.endTime}</span>
                  </div>
                  <span className={slot.isActive ? 'availability-status active' : 'availability-status'}>
                    {slot.isActive ? 'Active' : 'Paused'}
                  </span>
                  <div className="availability-actions">
                    <button
                      disabled={updatingId === slot.id}
                      type="button"
                      onClick={() => handleToggleSlot(slot)}
                    >
                      {slot.isActive ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      disabled={updatingId === slot.id}
                      type="button"
                      onClick={() => handleDeleteSlot(slot.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState compact title="No weekly slots">
              Add the days and times customers can book you.
            </EmptyState>
          )}
        </article>

        <article className="artisan-profile-panel">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Blocked dates</p>
              <h2>Days you are unavailable</h2>
            </div>
          </div>
          {unavailableDates.length > 0 ? (
            <div className="availability-list">
              {unavailableDates.map((date) => (
                <div className="availability-row" key={date.id}>
                  <div>
                    <strong>{date.unavailableDate}</strong>
                    <span>{date.reason || 'No reason added'}</span>
                  </div>
                  <div className="availability-actions">
                    <button
                      disabled={updatingId === date.id}
                      type="button"
                      onClick={() => handleDeleteUnavailableDate(date.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState compact title="No blocked dates">
              Block public holidays, personal days, or dates you are fully booked.
            </EmptyState>
          )}
        </article>
      </section>
    </div>
  )
}

export default ArtisanAvailability

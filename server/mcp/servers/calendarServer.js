import { MCPServer } from '../base/MCPServer.js';
import mongoose from 'mongoose';

// Pickup schedule schema
const pickupScheduleSchema = new mongoose.Schema({
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  donationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', required: true },
  scheduledTime: { type: Date, required: true },
  duration: { type: Number, default: 30 }, // minutes
  status: { 
    type: String, 
    enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const PickupSchedule = mongoose.model('PickupSchedule', pickupScheduleSchema);

/**
 * Calendar MCP Server
 * Provides scheduling and calendar management for pickups
 */
export class CalendarServer extends MCPServer {
  constructor() {
    super('calendar', 'Calendar and scheduling service for ResQ-AI pickup coordination');
  }

  async initialize() {
    await super.initialize();

    // Register tools
    this.registerTool(
      'bookPickupSlot',
      'Schedule a pickup slot for NGO and volunteer',
      this.bookPickupSlot.bind(this),
      {
        ngoId: { type: 'string', required: true, description: 'NGO user ID' },
        volunteerId: { type: 'string', description: 'Volunteer user ID (optional)' },
        donationId: { type: 'string', required: true, description: 'Donation ID' },
        scheduledTime: { type: 'string', required: true, description: 'ISO date string for pickup time' },
        duration: { type: 'number', description: 'Duration in minutes (default: 30)' },
        notes: { type: 'string', description: 'Additional notes' }
      }
    );

    this.registerTool(
      'getAvailableSlots',
      'Get available time slots for pickup scheduling',
      this.getAvailableSlots.bind(this),
      {
        date: { type: 'string', required: true, description: 'Date in YYYY-MM-DD format' },
        volunteerId: { type: 'string', description: 'Filter by volunteer availability' },
        duration: { type: 'number', description: 'Required duration in minutes' }
      }
    );

    this.registerTool(
      'getPickupSchedule',
      'Get pickup schedule for a user or date range',
      this.getPickupSchedule.bind(this),
      {
        userId: { type: 'string', description: 'User ID to filter schedules' },
        startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        status: { type: 'string', description: 'Filter by status' }
      }
    );

    this.registerTool(
      'updatePickupStatus',
      'Update the status of a pickup appointment',
      this.updatePickupStatus.bind(this),
      {
        scheduleId: { type: 'string', required: true, description: 'Pickup schedule ID' },
        status: { type: 'string', required: true, description: 'New status' },
        notes: { type: 'string', description: 'Update notes' }
      }
    );

    this.registerTool(
      'generateCalendarFile',
      'Generate downloadable calendar file (.ics) for pickup',
      this.generateCalendarFile.bind(this),
      {
        scheduleId: { type: 'string', required: true, description: 'Pickup schedule ID' }
      }
    );

    console.log('✅ Calendar server initialized with scheduling tools');
  }

  /**
   * Book a pickup slot
   */
  async bookPickupSlot({ ngoId, volunteerId, donationId, scheduledTime, duration = 30, notes }) {
    try {
      // Validate the scheduled time
      const pickupTime = new Date(scheduledTime);
      if (pickupTime < new Date()) {
        throw new Error('Cannot schedule pickup in the past');
      }

      // Check for conflicts
      const conflicts = await this.checkTimeConflicts(volunteerId, pickupTime, duration);
      if (conflicts.length > 0) {
        return {
          success: false,
          error: 'Time slot conflicts with existing schedule',
          conflicts
        };
      }

      // Create the pickup schedule
      const schedule = new PickupSchedule({
        ngoId,
        volunteerId,
        donationId,
        scheduledTime: pickupTime,
        duration,
        notes,
        status: volunteerId ? 'confirmed' : 'scheduled'
      });

      await schedule.save();

      // Generate calendar event details
      const calendarEvent = this.generateCalendarEvent(schedule);

      return {
        success: true,
        schedule: {
          id: schedule._id,
          ngoId: schedule.ngoId,
          volunteerId: schedule.volunteerId,
          donationId: schedule.donationId,
          scheduledTime: schedule.scheduledTime,
          duration: schedule.duration,
          status: schedule.status,
          notes: schedule.notes
        },
        calendarEvent,
        message: volunteerId 
          ? 'Pickup scheduled and confirmed with volunteer' 
          : 'Pickup scheduled, awaiting volunteer assignment'
      };
    } catch (error) {
      throw new Error(`Pickup booking failed: ${error.message}`);
    }
  }

  /**
   * Get available time slots
   */
  async getAvailableSlots({ date, volunteerId, duration = 30 }) {
    try {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(9, 0, 0, 0); // 9 AM start
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(18, 0, 0, 0); // 6 PM end

      // Generate 30-minute slots
      const slots = [];
      const slotDuration = duration;
      
      for (let time = new Date(startOfDay); time < endOfDay; time.setMinutes(time.getMinutes() + slotDuration)) {
        const slotEnd = new Date(time.getTime() + duration * 60000);
        
        // Check if slot is available
        const isAvailable = await this.isSlotAvailable(volunteerId, new Date(time), duration);
        
        slots.push({
          startTime: new Date(time).toISOString(),
          endTime: slotEnd.toISOString(),
          available: isAvailable,
          duration: duration,
          timeDisplay: new Date(time).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })
        });
      }

      return {
        date,
        volunteerId,
        totalSlots: slots.length,
        availableSlots: slots.filter(s => s.available).length,
        slots: slots
      };
    } catch (error) {
      throw new Error(`Available slots lookup failed: ${error.message}`);
    }
  }

  /**
   * Get pickup schedule
   */
  async getPickupSchedule({ userId, startDate, endDate, status }) {
    try {
      const query = {};
      
      // Date range filter
      if (startDate || endDate) {
        query.scheduledTime = {};
        if (startDate) {
          query.scheduledTime.$gte = new Date(startDate);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.scheduledTime.$lte = end;
        }
      }

      // User filter (either NGO or volunteer)
      if (userId) {
        query.$or = [
          { ngoId: userId },
          { volunteerId: userId }
        ];
      }

      // Status filter
      if (status) {
        query.status = status;
      }

      const schedules = await PickupSchedule.find(query)
        .populate('ngoId', 'name email')
        .populate('volunteerId', 'name email')
        .populate('donationId', 'foodType quantity pickupLocation')
        .sort({ scheduledTime: 1 });

      return {
        totalSchedules: schedules.length,
        schedules: schedules.map(schedule => ({
          id: schedule._id,
          ngo: schedule.ngoId,
          volunteer: schedule.volunteerId,
          donation: schedule.donationId,
          scheduledTime: schedule.scheduledTime,
          duration: schedule.duration,
          status: schedule.status,
          notes: schedule.notes,
          createdAt: schedule.createdAt
        })),
        filters: { userId, startDate, endDate, status }
      };
    } catch (error) {
      throw new Error(`Schedule lookup failed: ${error.message}`);
    }
  }

  /**
   * Update pickup status
   */
  async updatePickupStatus({ scheduleId, status, notes }) {
    try {
      const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'];
      
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const schedule = await PickupSchedule.findById(scheduleId);
      if (!schedule) {
        throw new Error('Pickup schedule not found');
      }

      const oldStatus = schedule.status;
      schedule.status = status;
      schedule.updatedAt = new Date();
      
      if (notes) {
        schedule.notes = notes;
      }

      await schedule.save();

      return {
        success: true,
        schedule: {
          id: schedule._id,
          oldStatus,
          newStatus: status,
          updatedAt: schedule.updatedAt,
          notes: schedule.notes
        },
        message: `Pickup status updated from ${oldStatus} to ${status}`
      };
    } catch (error) {
      throw new Error(`Status update failed: ${error.message}`);
    }
  }

  /**
   * Generate downloadable calendar file
   */
  async generateCalendarFile({ scheduleId }) {
    try {
      const schedule = await PickupSchedule.findById(scheduleId)
        .populate('ngoId', 'name email')
        .populate('volunteerId', 'name email')
        .populate('donationId', 'foodType quantity pickupLocation');

      if (!schedule) {
        throw new Error('Pickup schedule not found');
      }

      const icsContent = this.createICSFile(schedule);

      return {
        success: true,
        filename: `pickup_${scheduleId}.ics`,
        content: icsContent,
        mimeType: 'text/calendar',
        encoding: 'utf8',
        schedule: {
          title: `Food Pickup - ${schedule.donationId.foodType}`,
          startTime: schedule.scheduledTime,
          duration: schedule.duration,
          location: schedule.donationId.pickupLocation
        }
      };
    } catch (error) {
      throw new Error(`Calendar file generation failed: ${error.message}`);
    }
  }

  /**
   * Check for time conflicts
   */
  async checkTimeConflicts(volunteerId, scheduledTime, duration) {
    if (!volunteerId) return []; // No conflicts if no volunteer assigned

    const startTime = new Date(scheduledTime);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    const conflicts = await PickupSchedule.find({
      volunteerId,
      status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
      $or: [
        {
          scheduledTime: {
            $lt: endTime,
            $gte: startTime
          }
        },
        {
          $expr: {
            $and: [
              { $lt: ['$scheduledTime', endTime] },
              { $gte: [{ $add: ['$scheduledTime', { $multiply: ['$duration', 60000] }] }, startTime] }
            ]
          }
        }
      ]
    }).populate('donationId', 'foodType pickupLocation');

    return conflicts;
  }

  /**
   * Check if a time slot is available
   */
  async isSlotAvailable(volunteerId, startTime, duration) {
    const conflicts = await this.checkTimeConflicts(volunteerId, startTime, duration);
    return conflicts.length === 0;
  }

  /**
   * Generate calendar event object
   */
  generateCalendarEvent(schedule) {
    const startTime = new Date(schedule.scheduledTime);
    const endTime = new Date(startTime.getTime() + schedule.duration * 60000);

    return {
      title: `Food Pickup - ${schedule.donationId?.foodType || 'Donation'}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: schedule.duration,
      location: schedule.donationId?.pickupLocation || 'TBD',
      description: `ResQ-AI Food Pickup\n\nNotes: ${schedule.notes || 'None'}`,
      status: schedule.status,
      created: schedule.createdAt.toISOString()
    };
  }

  /**
   * Create ICS (iCalendar) file content
   */
  createICSFile(schedule) {
    const startTime = new Date(schedule.scheduledTime);
    const endTime = new Date(startTime.getTime() + schedule.duration * 60000);
    
    // Format dates for ICS (YYYYMMDDTHHMMSSZ)
    const formatICSDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ResQ-AI//Food Pickup Scheduler//EN',
      'BEGIN:VEVENT',
      `UID:pickup-${schedule._id}@resq-ai.com`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(startTime)}`,
      `DTEND:${formatICSDate(endTime)}`,
      `SUMMARY:Food Pickup - ${schedule.donationId?.foodType || 'Donation'}`,
      `DESCRIPTION:ResQ-AI Food Pickup\\n\\nDonation: ${schedule.donationId?.foodType}\\nQuantity: ${schedule.donationId?.quantity}\\nNotes: ${schedule.notes || 'None'}`,
      `LOCATION:${schedule.donationId?.pickupLocation || 'TBD'}`,
      `STATUS:${schedule.status.toUpperCase()}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Food pickup reminder',
      'TRIGGER:-PT15M',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return icsContent;
  }
}
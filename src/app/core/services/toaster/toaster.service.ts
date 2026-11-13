import { Injectable, signal } from '@angular/core';
import { toast } from 'ngx-sonner';

/**
 * Service for displaying toast notifications.
 */
@Injectable({
  providedIn: 'root'
})
export class ToasterService {
  /**
   * Displays a toast notification with the given message.
   */
  constructor() {}

  /**
   * Shows a success toast with a custom message.
   * @param message the message to display.
   */
  showSuccess(message: string): void {
    toast.success(message, { duration: 4000 });
  }

  /**
   * Shows an error toast with a custom message.
   * @param message the message to display.
   */
  showError(message: string): void {
    toast.error(message, { duration: 4000 });
  }

  /**
   * Shows a toast notification based on HTTP method and URL.
   * @param method the HTTP method used in the request.
   * @param url the URL of the request.
   * @param success indicates whether the operation was successful.
   */
  showStructuredToastMessage(method: string, url: string, success: boolean): void {
    const message = this._generateMessage(method, url, success);
    if (success) {
      toast.success(message, {
        duration: 4000
      });
    } else {
      toast.error(message, {
        duration: 4000
      });
    }
  }

  /**
   * Generates a message based on the HTTP method and URL.
   * @param method the HTTP method used in the request.
   * @param url the URL of the request.
   * @param success indicates whether the operation was successful.
   * @returns a generated message based on the method and URL.
   */
  private _generateMessage(method: string, url: string, success: boolean): string {
    let message: string = '';

    // Method message part.
    switch (method) {
      case 'POST':
        message = "Operazione di creazione per ";
        break;
      case 'PUT':
        message = "Operazione di aggiornamento per ";
        break;
      case 'DELETE':
        message = "Operazione di eliminazione per ";
        break;
      case 'PATCH':
        message = "Operazione di modifica per ";
        break;
      default:
        message = "Operazione per ";
        break;
    }

    // Resource message part.
    if (url.includes('users')) {
      message += "l'utente ";
    }
    if (url.includes('products')) {
      message += "il prodotto ";
    }
    if (url.includes('tenants')) {
      message += "il tenant ";
    }
    if (url.includes('contracts')) {
      message += "il contratto ";
    }
    if (url.includes('collaborators')) {
      message += "il collaboratore ";
    }
    if (url.includes('companies')) {
      message += "l'azienda ";
    }
    if (url.includes('trials')) {
      message += "il trial ";
    }
    if (url.includes('orders')) {
      message += "l'ordine ";
    }
    if (url.includes('resellers')) {
      message += "il rivenditore ";
    }

    // Success message part.
    if (success) {
      if (url.includes('users') || url.includes('tenants')) {
        message += "segnalata con successo. ";
      } else {
        message += "completata con successo.";
      }
    } else {
      message += "fallita.";
    }
    return message;
  }
}

import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export const showSuccess = (title: string, message?: string) => {
  toast.push(
    <Notification type="success" title={title} closable>
      {message}
    </Notification>,
    { placement: 'top-end' }
  );
};

export const showError = (title: string, message?: string) => {
  toast.push(
    <Notification type="danger" title={title} closable>
      {message}
    </Notification>,
    { placement: 'top-end' }
  );
};

export const showWarning = (title: string, message?: string) => {
  toast.push(
    <Notification type="warning" title={title} closable>
      {message}
    </Notification>,
    { placement: 'top-end' }
  );
};

export const showInfo = (title: string, message?: string) => {
  toast.push(
    <Notification type="info" title={title} closable>
      {message}
    </Notification>,
    { placement: 'top-end' }
  );
};
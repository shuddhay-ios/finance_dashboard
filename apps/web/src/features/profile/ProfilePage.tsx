import {
  AVATAR_CONTENT_TYPES,
  type UpdateProfileRequest,
  type UserResponse,
  updateProfileRequestSchema,
} from '@finance/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useAlertChips } from '../../components/alert-chips/alert-chip-store';
import { reportError, reportSuccess } from '../../components/alert-chips/report-error';
import { apiRequest } from '../../lib/api-client';
import { resizeImage } from '../../lib/resize-image';
import { useAuthStore } from '../auth/auth-store';

const AVATAR_SIZE_PX = 256;

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const queryClient = useQueryClient();

  // Cached transactions still carry the old name and photo, so refetch everything.
  const applyUpdatedUser = (updated: UserResponse) => {
    setAuthenticated(updated);
    void queryClient.invalidateQueries();
  };

  if (!user) {
    return null;
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h2" sx={{ mb: 2 }}>
          Profile photo
        </Typography>
        <PhotoSection user={user} onUpdated={applyUpdatedUser} />
      </Paper>
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h2" sx={{ mb: 2 }}>
          Personal details
        </Typography>
        <DetailsForm user={user} onUpdated={applyUpdatedUser} />
      </Paper>
    </Stack>
  );
}

interface SectionProps {
  user: UserResponse;
  onUpdated: (user: UserResponse) => void;
}

function PhotoSection({ user, onUpdated }: SectionProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  // Generated avatars are absolute DiceBear URLs; an uploaded photo is served by our API.
  const hasUploadedPhoto = user.avatarUrl.startsWith('/');

  const upload = useMutation({
    mutationFn: (image: Blob) => {
      const form = new FormData();
      form.append('avatar', image, 'avatar');
      return apiRequest<UserResponse>('/users/me/avatar', { method: 'PUT', body: form });
    },
    onSuccess: (updated) => {
      onUpdated(updated);
      reportSuccess('Profile photo updated');
    },
    onError: (error) => reportError(error),
  });

  const remove = useMutation({
    mutationFn: () => apiRequest<UserResponse>('/users/me/avatar', { method: 'DELETE' }),
    onSuccess: (updated) => {
      onUpdated(updated);
      reportSuccess('Profile photo removed');
    },
    onError: (error) => reportError(error),
  });

  const showProblem = (message: string) =>
    useAlertChips.getState().show({ severity: 'error', message });

  const handleFileChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clearing the input lets the same file be chosen again after an error.
    event.target.value = '';
    if (!file) {
      return;
    }
    if (!(AVATAR_CONTENT_TYPES as readonly string[]).includes(file.type)) {
      showProblem('Choose a PNG, JPEG or WebP image');
      return;
    }
    try {
      upload.mutate(await resizeImage(file, AVATAR_SIZE_PX));
    } catch {
      showProblem("Couldn't read that image. Try a different file");
    }
  };

  const isBusy = upload.isPending || remove.isPending;

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
      <Avatar src={user.avatarUrl} alt={user.name} sx={{ width: 96, height: 96 }} />
      <Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={isBusy ? undefined : <PhotoCameraOutlinedIcon />}
            onClick={() => fileInput.current?.click()}
            disabled={isBusy}
          >
            {upload.isPending ? <CircularProgress size={22} color="inherit" /> : 'Upload photo'}
          </Button>
          {hasUploadedPhoto && (
            <Button color="inherit" onClick={() => remove.mutate()} disabled={isBusy}>
              Remove photo
            </Button>
          )}
        </Stack>
        <Typography variant="caption" component="p" sx={{ mt: 1 }}>
          PNG, JPEG or WebP. It is cropped to a square and resized before uploading.
        </Typography>
        <input
          ref={fileInput}
          type="file"
          hidden
          accept={AVATAR_CONTENT_TYPES.join(',')}
          aria-label="Choose profile photo"
          onChange={(event) => void handleFileChosen(event)}
        />
      </Box>
    </Stack>
  );
}

function DetailsForm({ user, onUpdated }: SectionProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<UpdateProfileRequest>({
    resolver: zodResolver(updateProfileRequestSchema),
    defaultValues: { name: user.name },
  });

  const onSubmit = async ({ name }: UpdateProfileRequest) => {
    try {
      const updated = await apiRequest<UserResponse>('/users/me', {
        method: 'PATCH',
        body: { name },
      });
      onUpdated(updated);
      reset({ name: updated.name });
      reportSuccess('Name updated');
    } catch (error) {
      reportError(error);
    }
  };

  return (
    <Stack
      component="form"
      noValidate
      spacing={2.5}
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
    >
      <TextField
        label="Display name"
        error={Boolean(errors.name)}
        helperText={errors.name?.message ?? 'Shown in the top bar and next to your transactions.'}
        {...register('name')}
      />
      <TextField
        label="Email"
        value={user.email}
        disabled
        helperText="Your email is your login, so it can't be changed here."
      />
      <TextField label="Role" value={user.role} disabled />
      <Box>
        <Button type="submit" variant="contained" disabled={!isDirty || isSubmitting}>
          Save changes
        </Button>
      </Box>
    </Stack>
  );
}
